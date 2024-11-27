from django.shortcuts import render, redirect
from .models import Room, Message
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import viewsets, status

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .serializers import RoomSerializer, MessageSerializer, OperatorRegistrationSerializer
from django.http import Http404
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi



# Regular Django views

def HomeView(request):
    if request.method == "POST":
        username = request.POST["username"]
        room = request.POST["room"]
        try:
            existing_room = Room.objects.get(room_name__icontains=room)
        except Room.DoesNotExist:
            existing_room = Room.objects.create(room_name=room)
        return redirect("room", room_name=existing_room.room_name, username=username)
    return render(request, "chat/home.html")


class RoomView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, room_name, username, *args, **kwargs):
        """
        Получить информацию о комнате по названию и пользователю
        """
        try:
            room = Room.objects.get(name=room_name)

            # Пример возвращаемых данных — здесь можно добавить нужную логику
            data = {
                'room_name': room.name,
                'id': user.id
                # Возможно, стоит добавить больше информации о комнате
            }
            return Response(data)

        except Room.DoesNotExist:
            return Response({"error": "Room not found"}, status=404)




class MessageListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, room_id, *args, **kwargs):
        """
        Получить все сообщения для указанной комнаты
        """
        messages = Message.objects.filter(room_id=room_id).order_by('-timestamp')
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)

    def post(self, request, room_id, *args, **kwargs):
        """
        Создать новое сообщение в комнате
        """
        serializer = MessageSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user, room_id=room_id)  # Устанавливаем пользователя и комнату
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    
class RegisterOperatorView(APIView):
    
    @swagger_auto_schema(
    request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties= {
    'username': openapi.Schema(type=openapi.TYPE_STRING, description="Имя пользователя для регистрации"),
    'password': openapi.Schema(type=openapi.TYPE_STRING, description="Пароль для нового аккаунта"),
    'email': openapi.Schema(type=openapi.TYPE_STRING, format='email', description="Электронная почта пользователя"),
    'phone_number': openapi.Schema(type=openapi.TYPE_STRING, pattern=r'^\+\d{10,15}$', description="Номер телефона в формате +1234567890"),
},
        required=['username', 'password', 'email', 'phone_number']
    ),
    responses={
        status.HTTP_201_CREATED: openapi.Response(
            description="Operator registered successfully!",
            examples={
                'application/json': {'message': 'Operator registered successfully!'}
            }
        ),
        status.HTTP_400_BAD_REQUEST: openapi.Response(
            description="Invalid data"
        ),
    }
)

    def post(self, request):
        # Use the serializer to validate and save the data
        serializer = OperatorRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Operator registered successfully!'}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)