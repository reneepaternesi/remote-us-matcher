# RemoteUS Matcher 🎯

An AI-powered, data-dense job matching and tracking dashboard built for Senior Engineering roles.

This project was built to solve the signal-to-noise ratio in modern job hunting. It acts as a specialized pipeline that aggregates, scores, and tracks remote job opportunities using AI to filter out roles that don't match strict seniority, stack, and salary constraints.

## 🚀 Live Demo
**[Insert your Vercel Link Here]**

## 💻 Tech Stack
- **Framework:** Next.js (App Router), React 19
- **Styling:** Tailwind CSS, shadcn/ui, Framer Motion
- **Database & Backend:** Supabase (PostgreSQL), Prisma ORM
- **AI Integration:** Google Gemini API (for semantic analysis and automated matching)

## ✨ Key Features

- **Data-Dense Dashboards:** Designed to handle and display complex datasets without overwhelming the user, focusing on visual hierarchy and rapid scanning.
- **AI-Powered Scoring Engine:** Automatically parses job descriptions and scores them against a configurable professional profile, instantly discarding low-match roles.
- **Kanban Pipeline:** A drag-and-drop board to track the lifecycle of applications (Available → Applied → Interviewing → Rejected).
- **Pixel-Perfect UI:** Built entirely without handoffs. Every component is crafted with strong opinions on design, typography, spacing, and micro-interactions.
- **Serverless Architecture:** Fully deployed on Vercel with a Supabase PostgreSQL backend for fast, scalable data fetching.

## 🧠 Why I Built This (The Design Engineering Perspective)

As a Senior Frontend Engineer, I believe the best products emerge when there is no gap between design intent and engineering execution. I built this tool to demonstrate my ability to:
1. Own a product end-to-end (from database schema to final pixel).
2. Leverage AI tooling to drastically reduce iteration cycles.
3. Build interfaces that feel premium and trustworthy, especially when handling complex data workflows.

## 🛠️ Local Development

1. Clone the repository:
   \`\`\`bash
   git clone https://github.com/yourusername/remote-us-matcher.git
   \`\`\`
2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`
3. Set up your `.env` file with your Supabase and API keys:
   \`\`\`env
   DATABASE_URL="postgresql://postgres.[ID]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.[ID]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
   GEMINI_API_KEY="your_api_key"
   \`\`\`
4. Push the Prisma schema to your database:
   \`\`\`bash
   npx prisma db push
   \`\`\`
5. Run the development server:
   \`\`\`bash
   npm run dev
   \`\`\`
