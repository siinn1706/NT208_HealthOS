FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --require-hashes -r requirements.txt

COPY ws-corebe-smoke.py .

USER nobody
RUN chmod 444 /etc/passwd  # allow nobody to resolve UID in /etc/passwd; harmless

CMD ["python", "/app/ws-corebe-smoke.py"]
