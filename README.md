AI-powered documentation bot that automatically creates PR documentation when your code changes.

Security check:

When you create a webhook, you give GitHub a secret token (your GITHUB_WEBHOOK_SECRET). Only GitHub and your server know this.

ture -> github send it

false -> return

## How to start in loc dev server

### start the main server

compiled first - tsc
start the backend server - npm start  or node dist/index.js

### start the worker 

npx ts-node src/workers/repoIndex.worker.ts

### docker things

start the postgres server and paste in the env
start the redis server

:> i hoping you know your have to do port mapping other wise your are cooked

## Python Setup for CocoIndex

This project uses **cocoindex**, which **requires Python ≥ 3.11**.  
Older Python versions **will not work**.

To avoid environment issues, we explicitly pin **Python 3.11** and use a virtual environment.

### Verify Python Installation

Check which Python versions are available:

```bash
py list
```

create virtual enviroment:

```bash
py -3.11 -m venv venv
```

activate:

# Windows
venv\Scripts\activate

verify:
python --version

### install cocoindex
python -m pip install --upgrade pip
pip install cocoindex

cd cocoindex
cocoindex update main

to view 
cocoindex server -ci main

also don't forge to make .env inside /cocoindex and add the pgvector db url
COCOINDEX_DATABASE_URL=

other wise your are cooked one more time
