from sqlmodel import SQLModel, create_engine, Session, select
import os
from dotenv import load_dotenv
import traceback
from passlib.context import CryptContext

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./anpr.db")

engine = create_engine(
    DATABASE_URL,
    echo=True if os.getenv("DEBUG", "False").lower() == "true" else False,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

def get_db():
    with Session(engine) as session:
        try:
            yield session
        finally:
            session.close()

def create_db_and_tables():
    """Create database tables"""
    print("🔧 Creating database tables...")
    try:
        SQLModel.metadata.create_all(engine)
        print("✅ Database tables created")
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        print(traceback.format_exc())

def init_db():
    """Initialize database with default data"""
    print("🔧 Initializing database...")
    from app.models import User, UserRole
    
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    try:
        with Session(engine) as session:
            # Check if admin exists
            admin = session.exec(select(User).where(User.username == "admin")).first()
            if not admin:
                admin_user = User(
                    username="admin",
                    email="admin@anpr.com",
                    full_name="System Administrator",
                    hashed_password=pwd_context.hash("admin123"),
                    role=UserRole.ADMIN,
                    is_active=True
                )
                session.add(admin_user)
                
                # Also create a test user
                test_user = User(
                    username="test",
                    email="test@anpr.com",
                    full_name="Test User",
                    hashed_password=pwd_context.hash("test123"),
                    role=UserRole.VIEWER,
                    is_active=True
                )
                session.add(test_user)
                
                session.commit()
                print("✅ Created default users:")
                print("   - Username: admin | Password: admin123")
                print("   - Username: test  | Password: test123")
            else:
                print("✅ Admin user already exists")
                
            # List all users
            users = session.exec(select(User)).all()
            print(f"📋 Total users in database: {len(users)}")
            for user in users:
                print(f"   - {user.username} ({user.email}) - Role: {user.role}")
                
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        print(traceback.format_exc())