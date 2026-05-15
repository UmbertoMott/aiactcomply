/**
 * Progetto simulato: "CV-Screener AI"
 * Scenario: Sistema di screening CV per HR tech
 * Mix di librerie per testare la classificazione
 */
export const MOCK_PROJECT_FILES: Record<string, string> = {
  "requirements.txt": `flask==2.3.0
pandas==2.0.3
scikit-learn==1.3.0
xgboost==1.7.6
opencv-python==4.8.0.74
transformers==4.35.0
torch==2.1.0
numpy==1.24.3
face_recognition==1.3.0
python-multipart==0.0.6
sqlalchemy==2.0.20
gunicorn==21.2.0`,

  "src/api/main.py": `from flask import Flask, request, jsonify
import face_recognition
import cv2
import numpy as np
from src.models.screener import CandidateScreener
from src.api.health import health_check

app = Flask(__name__)

@app.route('/api/v1/screen-candidate', methods=['POST'])
def screen_candidate():
    """Screening CV and facial analysis for candidate evaluation"""
    cv_file = request.files['cv']
    photo = request.files['photo']
    
    # Biometric face encoding
    image = face_recognition.load_image_file(photo)
    face_encoding = face_recognition.face_encodings(image)
    
    # CV screening
    screener = CandidateScreener()
    result = screener.predict(cv_file)
    
    return jsonify({
        "candidate_id": request.form['candidate_id'],
        "screen_score": result["score"],
        "face_match": len(face_encoding) > 0,
        "recommendation": result["class"]
    })

@app.route('/api/v1/batch-screen', methods=['POST'])
def batch_screen():
    """Batch processing for multiple candidates"""
    data = request.json
    screener = CandidateScreener()
    results = []
    for candidate in data['candidates']:
        score = screener.predict(candidate['cv_data'])
        results.append({
            "id": candidate['id'],
            "score": score["score"]
        })
    return jsonify({"results": results})

@app.route('/api/v1/credit-score', methods=['POST'])
def credit_scoring():
    """Financial credit scoring"""
    from xgboost import XGBClassifier
    data = request.json
    model = XGBClassifier()
    score = model.predict_proba([data['features']])
    return jsonify({"credit_score": float(score[0][1])})`,

  "src/models/screener.py": `import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import xgboost as xgb
import joblib

class CandidateScreener:
    def __init__(self):
        self.model = RandomForestClassifier(
            n_estimators=100,
            random_state=42
        )
        self.credit_model = xgb.XGBClassifier()
    
    def fit(self, X_train, y_train):
        return self.model.fit(X_train, y_train)
    
    def predict(self, cv_data):
        features = self._extract_features(cv_data)
        prediction = self.model.predict_proba([features])
        return {
            "score": float(prediction[0][1]),
            "class": "HIRE" if prediction[0][1] > 0.7 else "REJECT"
        }
    
    def _extract_features(self, cv_data):
        df = pd.DataFrame([cv_data])
        # Feature engineering
        df['age_norm'] = (df['eta'] - 40) / 20
        df['gender_code'] = df['genere'].map({'M': 1, 'F': 0})
        df['income_bracket'] = pd.cut(df['reddito'], bins=5, labels=False)
        return df.iloc[0].values`,

  "src/utils/preprocessing.py": `import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder

def clean_dataset(df):
    """Data cleaning pipeline (Art. 10)"""
    df = df.drop_duplicates()
    df = df.dropna()
    return df

def encode_categorical(df):
    """Encode categorical variables"""
    le = LabelEncoder()
    for col in df.select_dtypes(include=['object']).columns:
        df[col] = le.fit_transform(df[col])
    return df

def normalize_features(df):
    """Normalize numerical features"""
    scaler = StandardScaler()
    numerical_cols = df.select_dtypes(include=['int64', 'float64']).columns
    df[numerical_cols] = scaler.fit_transform(df[numerical_cols])
    return df`,

  "src/api/health.py": "def health_check():\n    return {'status': 'ok', 'version': '2.3.1'}\n",

  "src/utils/bias_audit.py": `import pandas as pd
import numpy as np

def check_disparate_impact(df, protected_col='genere', target_col='esito'):
    """Check for fairness across protected groups"""
    groups = df[protected_col].unique()
    results = {}
    for group in groups:
        mask = df[protected_col] == group
        positive_rate = df[mask][target_col].mean()
        results[group] = positive_rate
    return results
`,
};
