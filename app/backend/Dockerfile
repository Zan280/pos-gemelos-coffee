FROM python:3.11.2
WORKDIR /code

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    libportaudio2 \
    libportaudiocpp0 \
    portaudio19-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/*


RUN pip install --upgrade pip

COPY requirements.txt .

RUN pip uninstall -y \ 
    mysqlclient

RUN pip install -r requirements.txt

#COPY . .

EXPOSE 8000
