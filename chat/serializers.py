from rest_framework import serializers
from .models import Room, Message, Operator

class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ['id']

class MessageSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()  # Чтобы показать имя пользователя вместо ID

    class Meta:
        model = Message
        fields = ['id', 'room', 'user', 'content', 'timestamp']


class OperatorRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Operator
        fields = ['username', 'password', 'email', 'phone_number']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        operator = Operator.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email'),
            phone_number=validated_data.get('phone_number'),
            password=validated_data['password']
        )
        operator.is_operator = True
        operator.save()
        return operator