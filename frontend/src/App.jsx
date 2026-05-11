import { useState } from 'react';
import axios from 'axios';

function App() {
  const [file, setFile] = useState(null);
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingEval, setLoadingEval] = useState(false);
  
  const [extractedData, setExtractedData] = useState(null);
  const [finalReport, setFinalReport] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setRawText("");
  };

  const handleTextChange = (e) => {
    setRawText(e.target.value);
    setFile(null);
  };

  const resetFlow = () => {
    setExtractedData(null);
    setFinalReport(null);
    setFile(null);
    setRawText("");
  };

  const handleExtract = async () => {
    if (!file && rawText.trim() === "") {
      alert("Please upload a file/image OR paste text!");
      return;
    }

    const formData = new FormData();
    if (file) formData.append('formulaFile', file);
    if (rawText.trim() !== "") formData.append('rawText', rawText);
    
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/extract`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setExtractedData(response.data.extractedData);
    } catch (error) {
      console.error("Extract Error:", error);
      alert("Error: Data extract nahi ho paya. Backend check karein.");
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    setLoadingEval(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/evaluate`, {
        ingredients: extractedData
      });
      setFinalReport(response.data.report);
    } catch (error) {
      console.error("Evaluate Error:", error);
      alert("Error: Compliance check fail ho gaya.");
    } finally {
      setLoadingEval(false);
    }
  };

  const exportToCSV = () => {
    if (!finalReport) return;

    // CSV Headers
    let csvContent = "Ingredient,Input %,Status,Remarks & Regulations\n";

    // Generate rows
    finalReport.forEach(item => {
      const ingredient = `"${(item.ingredient || '').replace(/"/g, '""')}"`;
      const inputPercentage = `"${(item.inputPercentage || '').replace(/"/g, '""')}"`;
      const status = `"${(item.status || '').replace(/"/g, '""')}"`;
      const remarks = `"${(item.remarks || '').replace(/"/g, '""')}"`;
      csvContent += `${ingredient},${inputPercentage},${status},${remarks}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "COFEPRIS_Compliance_Report.csv";
    link.click();
  };

  // UI Theme Colors
  const theme = {
    primaryGreen: '#2e7d32',
    lightGreen: '#e8f5e9',
    darkText: '#1b5e20',
    grayText: '#555555',
    glassBg: 'rgba(255, 255, 255, 0.85)',
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundImage: 'url("/bk.jpeg")', 
      backgroundSize: 'cover', 
      backgroundPosition: 'center', 
      backgroundAttachment: 'fixed',
      padding: '40px 20px',
      fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    }}>
      
      {/* Glassmorphism Main Card */}
      <div style={{ 
        maxWidth: '850px', 
        margin: 'auto', 
        backgroundColor: theme.glassBg, 
        backdropFilter: 'blur(12px)', 
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '20px', 
        padding: '40px', 
        boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
        border: '1px solid rgba(255,255,255,0.5)'
      }}>
        
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: theme.darkText, fontSize: '32px', margin: '0 0 10px 0', fontWeight: '800', letterSpacing: '1px' }}>
            🌿 COFEPRIS Compliance Checker
          </h1>
          <p style={{ color: theme.grayText, fontSize: '16px', margin: 0 }}>
            Intelligent Regulatory Analysis for Cosmetic Formulations
          </p>
        </div>
        
        {/* ======================================= */}
        {/* UI STATE 1: Upload Box */}
        {/* ======================================= */}
        {!extractedData && !finalReport && (
          <div style={{ 
            marginTop: '20px', padding: '30px', border: `2px dashed ${theme.primaryGreen}`, 
            borderRadius: '16px', backgroundColor: 'rgba(255,255,255,0.6)' 
          }}>
            <textarea 
              placeholder="Paste your cosmetic formula here... (e.g. Water 80%, Glycerin 10%)"
              value={rawText} onChange={handleTextChange}
              style={{ 
                width: '100%', height: '140px', padding: '15px', borderRadius: '12px', 
                border: '1px solid #ccc', boxSizing: 'border-box', marginBottom: '20px', 
                fontFamily: 'inherit', fontSize: '15px', resize: 'vertical',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)', outlineColor: theme.primaryGreen
              }}
            />
            
            <div style={{ display: 'flex', alignItems: 'center', margin: '15px 0' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#ccc' }}></div>
              <span style={{ padding: '0 15px', fontWeight: 'bold', color: theme.grayText, fontSize: '14px' }}>OR UPLOAD DOCUMENT / IMAGE</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#ccc' }}></div>
            </div>
            
            <div style={{ textAlign: 'center', marginBottom: '25px', marginTop: '20px' }}>
              <input 
                type="file" onChange={handleFileChange} accept=".csv, .txt, .pdf, image/*" 
                style={{
                  padding: '10px', background: '#fff', borderRadius: '8px', 
                  border: '1px solid #ddd', color: theme.grayText, cursor: 'pointer'
                }}
              />
            </div>
            
            <button 
              onClick={handleExtract} disabled={loading}
              style={{ 
                width: '100%', padding: '15px', backgroundColor: loading ? '#95a5a6' : theme.primaryGreen, 
                color: 'white', border: 'none', borderRadius: '12px', cursor: loading ? 'not-allowed' : 'pointer', 
                fontSize: '18px', fontWeight: 'bold', transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(46, 125, 50, 0.3)'
              }}
            >
              {loading ? "⚙️ Extracting Ingredients..." : "Step 1: Extract Ingredients ✨"}
            </button>
          </div>
        )}

        {/* ======================================= */}
        {/* UI STATE 2: Extracted List Dikhana */}
        {/* ======================================= */}
        {extractedData && !finalReport && (
          <div style={{ animation: 'fadeIn 0.5s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `2px solid ${theme.primaryGreen}`, paddingBottom: '15px', marginBottom: '20px' }}>
              <h3 style={{ color: theme.darkText, margin: 0, fontSize: '22px' }}>Step 1 Complete: Extracted Ingredients</h3>
              <span style={{ backgroundColor: theme.lightGreen, color: theme.primaryGreen, padding: '5px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold' }}>
                {extractedData.length} Items Found
              </span>
            </div>
            
            <p style={{ color: theme.grayText, marginBottom: '20px' }}>Please review the extracted data. If it looks correct, proceed to the compliance check.</p>
            
            <div style={{ 
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px',
              maxHeight: '400px', overflowY: 'auto', padding: '5px'
            }}>
              {extractedData.map((item, idx) => (
                <div key={idx} style={{ 
                  padding: '15px', backgroundColor: '#fff', borderLeft: `4px solid ${theme.primaryGreen}`, 
                  borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                  <strong style={{ color: '#333', fontSize: '15px' }}>{item.ingredient}</strong> 
                  <span style={{ backgroundColor: '#fff3e0', color: '#e65100', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px' }}>
                    {item.inputPercentage}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
              <button 
                onClick={resetFlow} 
                style={{ padding: '15px', backgroundColor: '#fff', color: theme.grayText, border: '1px solid #ccc', borderRadius: '10px', cursor: 'pointer', flex: 1, fontWeight: 'bold', fontSize: '16px', transition: 'all 0.2s' }}
              >
                Start Over
              </button>
              <button 
                onClick={handleEvaluate} disabled={loadingEval}
                style={{ padding: '15px', backgroundColor: loadingEval ? '#95a5a6' : theme.primaryGreen, color: 'white', border: 'none', borderRadius: '10px', cursor: loadingEval ? 'not-allowed' : 'pointer', fontWeight: 'bold', flex: 2, fontSize: '16px', boxShadow: '0 4px 10px rgba(46, 125, 50, 0.3)' }}
              >
                {loadingEval ? "⚙️ Evaluating Regulations..." : "Step 2: Run Compliance Check 🚀"}
              </button>
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* UI STATE 3: Final Report Dikhana */}
        {/* ======================================= */}
        {finalReport && (
          <div style={{ animation: 'fadeIn 0.5s' }}>
            <h3 style={{ color: theme.darkText, borderBottom: `2px solid ${theme.primaryGreen}`, paddingBottom: '15px', fontSize: '24px', margin: '0 0 20px 0' }}>
              📑 Final Compliance Report
            </h3>
            
            <div style={{ overflowX: 'auto', borderRadius: '12px', boxShadow: '0 5px 15px rgba(0,0,0,0.08)', border: '1px solid #eee' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff' }}>
                <thead>
                  <tr style={{ backgroundColor: theme.primaryGreen, color: 'white', textAlign: 'left' }}>
                    <th style={{ padding: '15px', fontWeight: '600' }}>Ingredient</th>
                    <th style={{ padding: '15px', fontWeight: '600' }}>Input %</th>
                    <th style={{ padding: '15px', fontWeight: '600' }}>Status</th>
                    <th style={{ padding: '15px', fontWeight: '600' }}>Remarks & Regulations</th>
                  </tr>
                </thead>
                <tbody>
                  {finalReport.map((item, index) => {
                    const isPass = item.status.toLowerCase() === 'pass';
                    const isWarning = item.status.toLowerCase() === 'warning';
                    
                    return (
                      <tr key={index} style={{ borderBottom: '1px solid #eee', transition: 'background-color 0.2s' }}>
                        <td style={{ padding: '15px', fontWeight: 'bold', color: '#333' }}>{item.ingredient}</td>
                        <td style={{ padding: '15px', color: '#555' }}>{item.inputPercentage}</td>
                        <td style={{ padding: '15px' }}>
                          <span style={{ 
                            padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px',
                            backgroundColor: isPass ? '#e8f5e9' : isWarning ? '#fff8e1' : '#ffebee',
                            color: isPass ? '#2e7d32' : isWarning ? '#f57f17' : '#c62828'
                          }}>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ padding: '15px', color: theme.grayText, fontSize: '14px', lineHeight: '1.5' }}>{item.remarks}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div style={{ textAlign: 'center', marginTop: '35px', display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <button 
                onClick={exportToCSV}
                style={{ padding: '14px 35px', backgroundColor: theme.primaryGreen, color: '#fff', border: 'none', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', transition: 'all 0.3s ease', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}
              >
                📥 Download Report (CSV)
              </button>

              <button 
                onClick={resetFlow} 
                style={{ padding: '14px 35px', backgroundColor: '#fff', color: theme.primaryGreen, border: `2px solid ${theme.primaryGreen}`, borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', transition: 'all 0.3s ease', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}
              >
                🔄 Check Another Formula
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;