# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Anonymous WebSocket Chat** — a serverless, single-channel, anonymous real-time chat room. No authentication, no message persistence. Static React frontend on GitHub Pages; backend on AWS (API Gateway WebSocket + Lambda + DynamoDB), deployed via AWS SAM.

The `documents/` folder contains detailed specs for every component. Read them before implementing anything.

## Repository Layout (target state)

```
nccu-chat-room/
├── webui/                  # React + Vite + TypeScript frontend
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/     # JoinScreen, ChatScreen, MessageList, MessageItem, MessageInput, StatusIndicator
│   │   ├── hooks/useWebSocket.ts
│   │   ├── types/index.ts
│   │   └── config.ts
│   ├── vite.config.ts      # base: '/ai_course_2/' for GitHub Pages
│   └── package.json
├── lambda/
│   ├── connect/connect.py
│   ├── disconnect/disconnect.py
│   └── send_message/send_message.py
├── template.yaml           # AWS SAM template
├── events/                 # Test event JSON files for sam local invoke
└── documents/              # Design docs — source of truth for specs
```

## Frontend Commands

```bash
cd webui
npm install
npm run dev       # http://localhost:5173
npm run build     # output: webui/dist/
```

Create `webui/.env.local` with `VITE_WS_ENDPOINT=wss://...` for local dev. The endpoint is read via `import.meta.env.VITE_WS_ENDPOINT` in `config.ts`.

`vite.config.ts` must set `base: '/ai_course_2/'` for GitHub Pages routing to work.

## Backend / AWS Commands

```bash
# Verify tooling
aws sts get-caller-identity
sam validate --template template.yaml
sam build

# First deploy (interactive — must be run by human)
sam deploy --guided   # Stack name: anonymous-chat, region: us-west-2

# Subsequent deploys
sam deploy --no-confirm-changeset

# Get the WebSocket URL after deploy
aws cloudformation describe-stacks \
  --stack-name anonymous-chat \
  --query "Stacks[0].Outputs[?OutputKey=='WebSocketUrl'].OutputValue" \
  --output text

# Tail Lambda logs
sam logs -n ConnectFunction --stack-name anonymous-chat --tail
sam logs -n SendMessageFunction --stack-name anonymous-chat --tail

# Check active connections
aws dynamodb scan --table-name ChatConnections

# Teardown
sam delete --stack-name anonymous-chat --no-prompts
```

## Lambda Local Testing

```bash
# Start DynamoDB Local
docker run -p 8000:8000 amazon/dynamodb-local

# Create local table
aws dynamodb create-table \
  --table-name ChatConnections \
  --attribute-definitions AttributeName=connectionId,AttributeType=S \
  --key-schema AttributeName=connectionId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:8000

# Invoke a Lambda locally against a test event
sam local invoke ConnectFunction -e events/connect_valid.json
sam local invoke DisconnectFunction -e events/disconnect.json
sam local invoke SendMessageFunction -e events/send_message.json
```

Lambda code should check for a `DYNAMODB_ENDPOINT` env var and use it when present (for local DynamoDB).

## Key Architecture Decisions

- **WebSocket routing** uses `$request.body.action` as the route selection expression. The `sendMessage` route is triggered when the client sends `{"action": "sendMessage", ...}`.
- **Callsign is stored at connect time** in DynamoDB, not passed in message payloads. The `send_message` Lambda reads callsign from DynamoDB by `connectionId` to prevent spoofing.
- **DynamoDB stores only active connections** (no message history). The only access patterns are PUT/DELETE by `connectionId` and SCAN for broadcast.
- **GoneException (410)** from `PostToConnection` means the connection is stale — delete it from DynamoDB and continue to the next connection.
- **`sam deploy --guided` requires human interaction** the first time to set the stack name and region and generate `samconfig.toml`. Subsequent deploys are non-interactive.

## WebSocket API Contract

| Route | Trigger | Handler |
|-------|---------|---------|
| `$connect` | Client opens WebSocket with `?callsign=` query param | `connect.handler` |
| `$disconnect` | Connection closes | `disconnect.handler` |
| `sendMessage` | Client sends `{"action":"sendMessage","text":"..."}` | `send_message.handler` |

Server pushes to clients:
- Chat message: `{"type":"message","callsign":"...","text":"...","timestamp":"..."}`
- System event: `{"type":"system","event":"user_joined"|"user_left","callsign":"...","timestamp":"..."}`

Callsign validation: `^[a-zA-Z0-9_]{1,20}$` — enforced both client-side (Join screen) and server-side (`$connect` Lambda; returns 400 to reject the handshake).

## DynamoDB Table

**Name:** `ChatConnections` | **PK:** `connectionId` (String)
Attributes: `callsign` (String), `connectedAt` (ISO 8601 String)
Billing: PAY_PER_REQUEST
