from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, ConfigDict, validator

class ScanStatus(str, Enum):
    SUCCESS = "Success"
    FAILED = "Failed"
    REVIEW = "Review"
    PROCESSING = "Processing"
    ALERT = "Alert"

class VehicleType(str, Enum):
    CAR = "Car"
    TRUCK = "Truck"
    MOTORCYCLE = "Motorcycle"
    BUS = "Bus"
    OTHER = "Other"

class UserRole(str, Enum):
    ADMIN = "admin"
    OPERATOR = "operator"
    VIEWER = "viewer"

# Database Models
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    email: str = Field(index=True, unique=True)
    full_name: Optional[str] = None
    hashed_password: str
    role: UserRole = Field(default=UserRole.VIEWER)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    scans: List["Scan"] = Relationship(back_populates="user")

class Scan(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    plate_number: str = Field(index=True)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    status: ScanStatus = Field(default=ScanStatus.PROCESSING)
    vehicle_type: Optional[VehicleType] = Field(default=VehicleType.CAR)
    location: Optional[str] = Field(default=None)
    camera_id: Optional[str] = Field(default=None)
    processing_time: Optional[float] = Field(default=None)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    image_path: str
    processed_image_path: Optional[str] = None
    annotations: Optional[str] = None
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    user: Optional[User] = Relationship(back_populates="scans")

class BlacklistedPlate(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    plate_number: str = Field(index=True, unique=True)
    reason: Optional[str] = None
    added_by: Optional[int] = Field(default=None, foreign_key="user.id")
    added_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = Field(default=True)

# Request/Response Models
class ScanCreate(BaseModel):
    camera_id: Optional[str] = None
    location: Optional[str] = None

class ScanRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    plate_number: str
    confidence: float
    status: ScanStatus
    vehicle_type: Optional[VehicleType]
    location: Optional[str]
    camera_id: Optional[str]
    processing_time: Optional[float]
    timestamp: datetime
    image_path: str
    processed_image_path: Optional[str]
    user_id: Optional[int]

class ScanUpdate(BaseModel):
    status: Optional[ScanStatus] = None
    confidence: Optional[float] = None
    annotations: Optional[str] = None
    plate_number: Optional[str] = None

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: Optional[str] = None
    role: Optional[UserRole] = UserRole.VIEWER

class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    role: UserRole
    is_active: bool
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class DashboardStats(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    total_scans: int
    success_rate: float
    avg_processing_time: float
    total_alerts: int
    recent_activity: List[ScanRead]
    hourly_stats: dict
    top_cameras: List[dict]

class PlateValidation(BaseModel):
    plate: str
    is_valid: bool
    suggestions: List[str]
    is_blacklisted: bool = False

class Alert(BaseModel):
    plate_number: str
    scan_id: int
    reason: str
    severity: str
    timestamp: datetime