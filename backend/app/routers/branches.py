from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models import Branch
from backend.app.schemas.branch import BranchOut

router = APIRouter(prefix="/api/branches", tags=["Branches"])

@router.get("", response_model=List[BranchOut])
def list_branches(db: Session = Depends(get_db)):
    return db.query(Branch).filter(Branch.is_active == True).all()

@router.get("/{id}", response_model=BranchOut)
def get_branch(id: int, db: Session = Depends(get_db)):
    branch = db.query(Branch).filter(Branch.id == id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    return branch

