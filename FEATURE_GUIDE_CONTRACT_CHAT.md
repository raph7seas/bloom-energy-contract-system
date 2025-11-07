# Contract AI Assistant - Visual Feature Guide

## Overview
The AI Assistant has been transformed into a contract-specific chat interface that allows you to select any contract and ask questions about it and its associated documents.

---

## How to Access

1. **Navigate to any contract** in your system
2. Click on the **"AI Assistant"** tab
3. You'll see the new Contract AI Assistant interface

---

## UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│                    💬 Contract AI Assistant                  │
│          Select a contract and ask questions about           │
│                    its documents                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Select Contract                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Choose a contract...                            ▼   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  When you select a contract, you'll see:                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📄 Contract: [Contract Name]                         │   │
│  │    [X] document(s) available                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                      CHAT MESSAGES                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                       │   │
│  │  🤖 I'm ready to help you with questions about       │   │
│  │     the "[Contract Name]" contract. I have access    │   │
│  │     to [X] document(s)...                            │   │
│  │                                           10:30 AM   │   │
│  │                                                       │   │
│  │                        What is the serial number? 👤 │   │
│  │                                           10:31 AM   │   │
│  │                                                       │   │
│  │  🤖 Based on the contract documents, the serial      │   │
│  │     number is [SERIAL_NUMBER] as found in            │   │
│  │     [Document Name].                                 │   │
│  │                                           10:31 AM   │   │
│  │                                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Ask a question about this contract...               │   │
│  │                                                       │   │
│  └─────────────────────────────────────────────────────┘ 📤│
│  Press Enter to send, Shift+Enter for new line              │
└─────────────────────────────────────────────────────────────┘
```

---

## Feature Components

### 1. Contract Selector
- **Dropdown menu** showing all available contracts
- Displays: `[Contract Name] - [Client] ([Status])`
- Example: "Tech Campus PPA - Acme Corp (Active)"

### 2. Document Info Panel (appears after selection)
- Shows selected contract name
- Displays number of associated documents
- Loading indicator while fetching documents

### 3. Chat Interface
- **Welcome Message**: AI introduces itself and confirms document access
- **Message Bubbles**:
  - User messages (blue, right-aligned)
  - AI responses (gray, left-aligned)
  - Timestamps on each message
- **Auto-scroll**: Automatically scrolls to latest message

### 4. Input Area
- Multi-line text input
- Send button with icon
- Keyboard shortcuts:
  - `Enter`: Send message
  - `Shift+Enter`: New line
- Disabled during AI processing

---

## Example Questions You Can Ask

### Serial Numbers & Parts
```
❓ "What is the serial number?"
❓ "What parts are listed in the documents?"
❓ "What is the equipment serial number?"
```

### Financial Information
```
❓ "Who is the financier?"
❓ "What is the base rate?"
❓ "What are the payment terms?"
❓ "What is the escalation rate?"
❓ "What is the total contract value?"
```

### Contract Terms
```
❓ "What is the contract term length?"
❓ "When is the effective date?"
❓ "What are the warranty terms?"
❓ "What is the payment frequency?"
```

### Technical Details
```
❓ "What is the system capacity?"
❓ "What voltage level is specified?"
❓ "How many servers are included?"
❓ "What components are part of this system?"
```

### General Inquiries
```
❓ "Give me a summary of this contract"
❓ "What are the key terms?"
❓ "Are there any special conditions?"
❓ "What site is this for?"
```

---

## How It Works Behind the Scenes

### Data Flow

1. **Contract Selection**
   ```
   User selects contract
        ↓
   Frontend fetches contract details
        ↓
   Frontend fetches all associated documents
        ↓
   Frontend fetches content for each document
        ↓
   AI receives full context
   ```

2. **Question & Answer**
   ```
   User types question
        ↓
   Frontend sends to backend with:
     - User's question
     - Full contract data
     - All document contents
     - Conversation history (last 10 messages)
        ↓
   Backend (AnthropicProvider) builds context:
     - Adds contract metadata
     - Adds document contents
     - Creates specialized system prompt
        ↓
   Claude AI processes:
     - Reviews all provided information
     - Searches for relevant details
     - Generates specific answer
        ↓
   Response returns to frontend
        ↓
   Message displayed in chat
   ```

### AI Context Includes

**Contract Information:**
- Contract ID, Name, Client, Site
- Capacity, Term, Type, Status
- Total Value, Effective Date
- Financial Parameters (base rate, escalation, payment terms)
- Technical Parameters (voltage, servers, components)
- Operating Parameters (warranty, efficiency)

**Document Information:**
- Document title and filename
- Document type (PRIMARY, APPENDIX, AMENDMENT, etc.)
- Page count
- **Full document content** (up to 5000 chars per document)

---

## Visual States

### Empty State
When no contract is selected:
```
┌─────────────────────────────────────┐
│                                     │
│            💬                       │
│       No Contract Selected          │
│                                     │
│   Select a contract above to        │
│   start asking questions            │
│                                     │
└─────────────────────────────────────┘
```

### Loading States

**Loading Contracts:**
```
⏳ Loading contracts...
```

**Loading Documents:**
```
📄 Contract: [Name]
   ⏳ Loading documents...
```

**AI Processing:**
```
[Gray bubble with spinning loader icon]
```

### Error State
```
┌─────────────────────────────────────┐
│ ⚠️ Failed to load contract details  │
└─────────────────────────────────────┘
```

---

## Key Features

### ✅ Context-Aware Responses
- AI only answers based on provided documents
- Clearly states when information isn't available
- References specific documents when citing information

### ✅ Conversation Memory
- Maintains last 10 messages for context
- Supports follow-up questions
- AI remembers what was discussed

### ✅ Document Integration
- Automatically loads ALL associated documents
- Includes document content in AI context
- Searches across all documents for answers

### ✅ Smart Prompting
- Specialized system prompts for contract questions
- Instructed to be specific and cite sources
- Trained on Bloom Energy contract terminology

### ✅ User-Friendly Design
- Clean, modern interface
- Responsive layout
- Clear loading states
- Helpful error messages

---

## Technical Details

### Files Modified/Created

1. **`src/components/contract/ContractChatAssistant.tsx`** (NEW)
   - Main chat component
   - Contract selector
   - Message display
   - Document fetching logic

2. **`src/components/contract/AIAssistantTab.tsx`** (MODIFIED)
   - Now renders ContractChatAssistant
   - Simplified from previous three-tab interface

3. **`server/src/services/ai/AnthropicProvider.js`** (ENHANCED)
   - Added `_buildChatSystemPrompt()` method
   - Added `_buildContractContextMessage()` method
   - Enhanced `chat()` method to handle contract context

### API Endpoints Used

- `GET /api/contracts` - Fetch all contracts
- `GET /api/contracts/:id` - Fetch specific contract
- `GET /api/contracts/:contractId/documents` - Fetch documents
- `GET /api/documents/:documentId/content` - Fetch document content
- `POST /api/ai/chat` - Send message to AI

---

## Testing the Feature

### Manual Testing Steps

1. **Start the application**
   ```bash
   npm run dev
   ```

2. **Navigate to a contract**
   - Go to Contracts page
   - Click on any contract
   - Click "AI Assistant" tab

3. **Select a contract from dropdown**

4. **Wait for documents to load**

5. **Ask test questions:**
   - "What is the client name?"
   - "What is the capacity?"
   - "Who is the financier?"
   - "What documents are available?"

6. **Verify responses:**
   - AI should cite specific information
   - AI should reference documents
   - AI should say "I don't know" if info isn't available

---

## Tips for Best Results

### ✅ DO:
- Ask specific questions
- Ask about one topic at a time
- Use follow-up questions for clarification
- Reference previous messages in conversation

### ❌ DON'T:
- Ask about information not in the documents
- Expect AI to calculate or perform complex operations
- Ask multiple unrelated questions at once

---

## Future Enhancements

Potential improvements for this feature:

1. **Document Search Highlighting**
   - Show which document contains the answer
   - Highlight relevant text in documents

2. **Export Conversation**
   - Save chat history
   - Export as PDF/text

3. **Quick Actions**
   - Suggested questions based on contract
   - Common queries as buttons

4. **Multi-Contract Comparison**
   - Compare multiple contracts
   - Answer questions across contracts

5. **Streaming Responses**
   - Real-time text generation
   - See AI "typing" effect

---

## Need Help?

If you encounter issues:

1. **Check browser console** for errors
2. **Verify API endpoints** are accessible
3. **Ensure Anthropic API key** is configured
4. **Check document upload status** in contract
5. **Try a different contract** to isolate issues

For more information, refer to the main README or contact support.
