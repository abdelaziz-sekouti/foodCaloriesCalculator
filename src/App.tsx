/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Search, Utensils, Info, Flame, Zap, Droplets, Beef, History, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types
interface NutritionData {
  foodName: string;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  summary: string;
}

interface HistoryItem {
  id: string;
  data: NutritionData;
  timestamp: number;
}

export default function App() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NutritionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('nutriscan_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('nutriscan_history', JSON.stringify(history));
  }, [history]);

  const fetchNutrition = async (food: string) => {
    if (!food.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Provide detailed nutrition facts for: ${food}. If multiple items are mentioned, provide details for the most prominent one or a combined estimate.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              foodName: { type: Type.STRING },
              servingSize: { type: Type.STRING, description: "Standard serving size, e.g., '100g' or '1 medium apple'" },
              calories: { type: Type.NUMBER },
              protein: { type: Type.NUMBER, description: "Grams of protein" },
              carbs: { type: Type.NUMBER, description: "Grams of total carbohydrates" },
              fat: { type: Type.NUMBER, description: "Grams of total fat" },
              fiber: { type: Type.NUMBER, description: "Grams of fiber" },
              sugar: { type: Type.NUMBER, description: "Grams of sugar" },
              sodium: { type: Type.NUMBER, description: "Milligrams of sodium" },
              summary: { type: Type.STRING, description: "A brief health summary of this food" },
            },
            required: ["foodName", "servingSize", "calories", "protein", "carbs", "fat", "summary"]
          }
        }
      });

      const data = JSON.parse(response.text) as NutritionData;
      setResult(data);
      
      // Add to history
      setHistory(prev => {
        const newItem: HistoryItem = {
          id: Math.random().toString(36).substr(2, 9),
          data,
          timestamp: Date.now()
        };
        // Keep only last 10 items
        return [newItem, ...prev.filter(h => h.data.foodName !== data.foodName)].slice(0, 10);
      });
      
    } catch (err) {
      console.error(err);
      setError("Could not find nutrition data. Please try a different food name.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchNutrition(query);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('nutriscan_history');
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center py-12 px-4 sm:px-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl shadow-lg mb-4">
            <Utensils className="text-white w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-neutral-900 mb-2">NutriScan</h1>
          <p className="text-neutral-500">Instant AI-powered nutrition analysis for any food.</p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSubmit} className="relative mb-8">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter food (e.g., 'Avocado toast', 'Grilled Salmon')"
              className="w-full pl-12 pr-4 py-4 bg-white border border-neutral-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-lg"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2 top-2 bottom-2 px-6 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Scan'}
            </button>
          </div>
        </form>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-center gap-2"
            >
              <Info size={16} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              key={result.foodName}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-neutral-200 rounded-3xl shadow-xl overflow-hidden mb-8"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-neutral-900 capitalize">{result.foodName}</h2>
                    <p className="text-neutral-500 font-medium">Serving: {result.servingSize}</p>
                  </div>
                  <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full flex items-center gap-2 font-bold">
                    <Flame size={18} />
                    {result.calories} kcal
                  </div>
                </div>

                {/* Macro Grid */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <MacroCard label="Protein" value={result.protein} unit="g" icon={<Beef className="text-red-500" />} color="bg-red-50" />
                  <MacroCard label="Carbs" value={result.carbs} unit="g" icon={<Zap className="text-amber-500" />} color="bg-amber-50" />
                  <MacroCard label="Fat" value={result.fat} unit="g" icon={<Droplets className="text-blue-500" />} color="bg-blue-50" />
                </div>

                {/* Micro Details */}
                <div className="space-y-3 border-t border-neutral-100 pt-6 mb-6">
                  <DetailRow label="Fiber" value={result.fiber} unit="g" />
                  <DetailRow label="Sugar" value={result.sugar} unit="g" />
                  <DetailRow label="Sodium" value={result.sodium} unit="mg" />
                </div>

                {/* Summary */}
                <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
                  <p className="text-neutral-600 text-sm italic leading-relaxed">
                    "{result.summary}"
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History */}
        {history.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
                <History size={18} className="text-neutral-400" />
                Recent Scans
              </h3>
              <button 
                onClick={clearHistory}
                className="text-xs font-medium text-neutral-400 hover:text-red-500 transition-colors"
              >
                Clear History
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setResult(item.data);
                    setQuery(item.data.foodName);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="flex items-center justify-between p-4 bg-white border border-neutral-200 rounded-2xl hover:border-emerald-500 hover:shadow-md transition-all text-left group"
                >
                  <div>
                    <p className="font-semibold text-neutral-800 capitalize truncate max-w-[150px]">{item.data.foodName}</p>
                    <p className="text-xs text-neutral-400">{item.data.calories} kcal</p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Search size={14} className="text-emerald-500" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
      
      <footer className="mt-auto pt-12 text-neutral-400 text-xs text-center">
        <p>Nutritional data is estimated by AI and should be used for informational purposes only.</p>
      </footer>
    </div>
  );
}

function MacroCard({ label, value, unit, icon, color }: { label: string, value: number, unit: string, icon: React.ReactNode, color: string }) {
  return (
    <div className={`${color} p-4 rounded-2xl flex flex-col items-center text-center transition-transform hover:scale-105`}>
      <div className="mb-2">{icon}</div>
      <div className="text-xl font-bold text-neutral-900">{value}{unit}</div>
      <div className="text-[10px] uppercase tracking-wider font-bold text-neutral-500">{label}</div>
    </div>
  );
}

function DetailRow({ label, value, unit }: { label: string, value: number | undefined, unit: string }) {
  if (value === undefined) return null;
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="font-semibold text-neutral-800">{value}{unit}</span>
    </div>
  );
}
