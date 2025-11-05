# 🌙 Baby Sleep Helper

A beautiful, AI-powered sleep training assistant designed specifically for exhausted parents seeking gentle, no-cry sleep solutions for their little ones.

![Baby Sleep Helper](https://img.shields.io/badge/React-18.2.0-blue) ![Flask](https://img.shields.io/badge/Flask-2.3.3-green) ![AI](https://img.shields.io/badge/AI-Gemini%20Pro-purple)

## ✨ Features

- **🤖 AI-Powered Sleep Training Specialist** - Get personalized advice from a gentle sleep consultant
- **💤 No-Cry Methods Focus** - Specialized in gentle, attachment-focused sleep training
- **👶 Parent-Friendly Interface** - Beautiful, calming design built for tired parents
- **💬 Interactive Chat** - Real-time conversations with sleep training expertise
- **📱 Mobile Responsive** - Works perfectly on all devices
- **🎯 Topic Suggestions** - Quick-start buttons for common sleep challenges

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- Google Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/baby-sleep-app.git
   cd baby-sleep-app
   ```

2. **Set up the backend**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env and add your Gemini API key (see below for instructions)
   ```
   
   **Important**: The `.env` file is already in `.gitignore` and will NOT be uploaded to GitHub. Your API key is safe and will be saved locally on your machine.

4. **Set up the frontend**
   ```bash
   cd ../frontend
   npm install
   ```

### Running the Application

1. **Start the backend server**
   
   **Option 1: Using the script (recommended)**
   ```bash
   cd backend
   ./start_server.sh
   ```
   
   **Option 2: Manual start**
   ```bash
   cd backend
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   python app.py
   ```
   
   Backend will run on `http://localhost:5001`
   
   **Important**: Make sure the backend is running before trying to sign up or login!
   
   You should see output like:
   ```
   * Running on http://0.0.0.0:5001
   ```

2. **Start the frontend development server**
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend will run on `http://localhost:5173`

3. **Open your browser**
   Navigate to `http://localhost:5173` and start chatting with your sleep training assistant!

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here
```

### Getting a Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key and add it to your `.env` file

## 🏗️ Project Structure

```
baby-sleep-app/
├── backend/
│   ├── app.py              # Flask API server
│   ├── database.py         # Database initialization
│   ├── models.py           # Data models
│   ├── requirements.txt    # Python dependencies
│   ├── .env               # Environment variables (not in git)
│   └── chatbot.db         # SQLite database
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── api/           # API service layer
│   │   └── App.jsx        # Main application
│   ├── package.json       # Node dependencies
│   └── vite.config.js     # Vite configuration
└── README.md
```

## 🎯 How to Use

1. **Start a Conversation** - Click on any suggestion chip to begin
2. **Ask Specific Questions** - Describe your baby's sleep challenges
3. **Get Personalized Advice** - Receive gentle, evidence-based recommendations
4. **Follow Step-by-Step Guidance** - Get actionable sleep training methods

### Example Questions to Ask

- "My 6-month-old wakes up every 2 hours at night"
- "Help me create a bedtime routine for my toddler"
- "What are gentle ways to stop night feedings?"
- "My baby only sleeps in my arms, how do I transition?"

## 🛠️ Development

### Backend Development

The backend is built with Flask and provides:
- RESTful API endpoints
- SQLite database for conversation history
- Google Gemini AI integration
- CORS support for frontend communication

### Frontend Development

The frontend is built with React and Vite, featuring:
- Modern React 18 with hooks
- Beautiful, responsive design
- Real-time chat interface
- Mobile-first approach

### Adding New Features

1. **Backend**: Add new routes in `app.py`
2. **Frontend**: Create components in `src/components/`
3. **Styling**: Update `src/index.css`

## 📦 Deployment

### Backend Deployment

1. Set up a Python hosting service (Heroku, Railway, etc.)
2. Add your environment variables
3. Deploy the Flask application

### Frontend Deployment

1. Build the production version:
   ```bash
   cd frontend
   npm run build
   ```
2. Deploy the `dist` folder to a static hosting service (Netlify, Vercel, etc.)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [React](https://reactjs.org/) and [Flask](https://flask.palletsprojects.com/)
- AI powered by [Google Gemini](https://ai.google.dev/)
- Designed for exhausted parents everywhere 💙

## 📞 Support

If you have any questions or need help, please open an issue on GitHub.

---

**Made with 💙 for tired parents and their little ones**
