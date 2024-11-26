from django.urls import path,include
from .views import HomeView, RoomView, RegisterOperatorView
from chat import views

urlpatterns = [
    path("", HomeView, name="login"),
    path("<str:room_name>/<str:username>/", RoomView, name="room"),
    path("api/example/", views.example_view, name="example-api"),
    path('register/operator/', RegisterOperatorView.as_view(), name='register_operator'),



]
