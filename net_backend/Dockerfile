FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build
WORKDIR /src
COPY ["net_backend.csproj", "./"]
RUN dotnet restore "net_backend.csproj"
COPY . .
RUN dotnet publish "net_backend.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:6.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Create storage directory and set permissions
RUN mkdir -p /app/wwwroot/storage && chmod -R 777 /app/wwwroot/storage

EXPOSE 80
ENTRYPOINT ["dotnet", "net_backend.dll"]
