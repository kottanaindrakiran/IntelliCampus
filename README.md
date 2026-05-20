# 🎓 IntelliCampus Hub

**IntelliCampus Hub** is a verified, student-centric social and academic networking platform designed to connect students and alumni across colleges. It combines the engagement of modern social platforms with the trust and focus required for academic collaboration.

<img width="1831" height="956" alt="image" src="https://github.com/user-attachments/assets/971e57ca-28b9-4a97-a71a-dcf0d80c1c6e" />

<img width="1847" height="960" alt="image" src="https://github.com/user-attachments/assets/2584163d-4c99-4355-9709-3fc2abe7064c" />

<img width="1881" height="970" alt="image" src="https://github.com/user-attachments/assets/e6063ab1-e206-4aed-91d6-91e35a61ff50" />







## 🌟 Overview

In today’s digital world, students lack a **verified and focused platform** to collaborate beyond their campus. Existing social media platforms are noisy and unverified, while college portals are limited and rigid.

**IntelliCampus Hub** fills this gap by providing:
- Verified student & alumni networking  
- Campus-centric social feeds  
- Academic project sharing  
- Secure real-time communication  

---

## 🚀 Key Features

### 🔐 Verified Student Network
- Email & document-based verification  
- Supports students without college email IDs  
- Separate flows for **current students** and **alumni**

### 📰 Social Feed
- Campus-wise and branch-wise posts  
- Academic, event, campus life & alumni categories  
- Multimedia support (images & videos)

### 📂 Project Repository
- Upload ZIP files with descriptions  
- Download, like, and comment on projects  
- Encourages peer learning & collaboration

### 💬 Real-Time Chat
- One-to-one messaging  
- Group chat support  
- File & media sharing

### 🧑‍🎓 Alumni Engagement
- Dedicated alumni feed  
- Career updates, mentorship & guidance  
- Strong junior–senior connection

---

## 🛠 Technology Stack

### Frontend
- React 18  
- TypeScript  
- Vite  
- React Router DOM  
- Tailwind CSS  
- shadcn/ui  
- Framer Motion  
- Lucide Icons  
- Recharts  

### State & Forms
- @tanstack/react-query  
- React Hook Form  
- Zod  

### Backend (BaaS)
- Supabase  
  - Authentication  
  - PostgreSQL Database  
  - Storage  
  - Edge Functions  
  - Realtime  

### Utilities
- date-fns  
- Sonner (Toasts)  
- Docker (local Edge Function testing)  
- Tesseract.js (OCR)

---

## 🧠 System Architecture

The application follows a **Serverless Client–Database Architecture**:

1. **Client Tier**
   - React + TypeScript SPA  
   - Handles UI, routing, and user interactions  
   - Communicates directly with Supabase APIs  

2. **Logic Tier (Serverless)**
   - Supabase Auth (JWT-based authentication)  
   - PostgreSQL Row Level Security (RLS)  
   - Supabase Edge Functions for OCR verification  

3. **Data Tier**
   - PostgreSQL (users, posts, projects, chats)  
   - Supabase Storage (media, project files, ID documents)

---

## 🔍 ID Verification System (Core Novelty)

### Workflow
1. User uploads ID document (Image/PDF)  
2. Stored securely in a **private Supabase Storage bucket**  
3. Supabase Edge Function is triggered  
4. **Tesseract.js OCR** extracts text  
5. Extracted data is matched with:
   - User name  
   - College name  
6. Score-based validation (threshold ≥ 70%)  
7. User marked as **Verified**

### Benefits
- No manual admin verification  
- Works even without college email  
- Secure & privacy-preserving  

---

## 📂 Project Structure

```text
/
├── database/
│   ├── migrations/
│   └── schema/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   ├── feed/
│   │   ├── layout/
│   ├── hooks/
│   ├── pages/
│   ├── integrations/
│   ├── types/
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── vite.config.ts
└── tailwind.config.ts
````

---

## ⚙️ Installation & Setup

### Prerequisites

* Node.js v18 or higher
* npm
* Supabase project (URL & Anon Key)

### Clone Repository

```bash
git clone <repository-url>
cd studentconnect-hub-main
```

### Install Dependencies

```bash
npm install
```

### Environment Setup

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## ▶️ Running the Project

### Development

```bash
npm run dev
```

Runs at: `http://localhost:8080`

### Production Build

```bash
npm run build
```

Build output is generated in the `dist/` directory.

---

## 🔐 Security

* PostgreSQL Row Level Security (RLS)
* Private storage buckets for sensitive documents
* Role-based access control
* Verified-only posting permissions

---

## 🔮 Future Scope

* AI-based project & mentor recommendations
* Job & internship portal
* React Native mobile application
* Virtual events & webinars
* Cross-college hackathon hosting

---

## ✅ Conclusion

IntelliCampus Hub demonstrates how modern serverless technologies can be combined to build a **secure, verified, and engaging student ecosystem**. The platform successfully bridges academic collaboration and social interaction while maintaining trust, privacy, and scalability.

