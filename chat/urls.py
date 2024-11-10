from django.urls import path,include
from .views import HomeView, RoomView
from chat import views

urlpatterns = [
    path("", HomeView, name="login"),
    path("<str:room_name>/<str:username>/", RoomView, name="room"),
    path("api/example/", views.example_view, name="example-api"),


]
