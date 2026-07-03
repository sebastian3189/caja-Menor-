# ── Build ──
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copiar solo los .csproj primero (cachea el restore mientras no cambien las dependencias)
COPY src/CajaMenor.Domain/CajaMenor.Domain.csproj CajaMenor.Domain/
COPY src/CajaMenor.Application/CajaMenor.Application.csproj CajaMenor.Application/
COPY src/CajaMenor.Infrastructure/CajaMenor.Infrastructure.csproj CajaMenor.Infrastructure/
COPY src/CajaMenor.Shared/CajaMenor.Shared.csproj CajaMenor.Shared/
COPY src/CajaMenor.API/CajaMenor.API.csproj CajaMenor.API/
RUN dotnet restore CajaMenor.API/CajaMenor.API.csproj

COPY src/ .
RUN dotnet publish CajaMenor.API/CajaMenor.API.csproj -c Release -o /app/publish --no-restore

# ── Runtime ──
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime

# Tesseract OCR (fallback local cuando no hay Azure Form Recognizer configurado)
RUN apt-get update \
    && apt-get install -y --no-install-recommends tesseract-ocr libleptonica-dev libtesseract-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "CajaMenor.API.dll"]
