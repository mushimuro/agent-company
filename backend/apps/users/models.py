import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    """
    Custom user model with UUID primary key.
    Extends Django's AbstractUser with additional fields.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)  # Override to make unique
    
    # Settings
    preferred_llm_model = models.CharField(
        max_length=50,
        choices=[('glm-7', 'GLM-7'), ('gemini-2.5-flash', 'Gemini 2.5 Flash')],
        default='gemini-2.5-flash'
    )
    
    class Meta:
        db_table = 'users'
        ordering = ['-date_joined']
    
    def __str__(self):
        return self.username
