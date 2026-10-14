# Contributing to BellsGallery

Thank you for your interest in contributing to **BellsGallery**! We welcome contributions to enhance our omnichannel e-commerce platform and Web-AR Virtual Fitting Room.

---

## 🛠 Development Workflow

1. **Fork & Clone**
   ```bash
   git clone https://github.com/jalona99/BellsGallery.git
   cd BellsGallery
   ```

2. **Branching Strategy**
   - Create a feature branch: `git checkout -b feature/your-feature-name`
   - Or bugfix branch: `git checkout -b fix/issue-description`

3. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   npx prisma generate
   npm run dev
   ```

4. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   cp .env.example .env.local
   npm run dev
   ```

5. **Code Quality & Verification**
   Ensure type safety and linting passes before committing:
   ```bash
   # In backend
   npx tsc --noEmit

   # In frontend
   npx tsc --noEmit
   npm run lint
   ```

6. **Submit a Pull Request**
   - Push your branch: `git push origin feature/your-feature-name`
   - Open a Pull Request detailing the changes made using our PR template.

---

## 🔒 Security & Vulnerability Reporting

If you discover a security vulnerability, please do NOT open a public issue. Instead, report it privately to the maintainer at `jabararya760@gmail.com`.
