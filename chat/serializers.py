from rest_framework import serializers
from .models import Room, Message

class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ['id']

class MessageSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()  # Чтобы показать имя пользователя вместо ID

    class Meta:
        model = Message
        fields = ['id', 'room', 'user', 'content', 'timestamp']
