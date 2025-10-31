"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function PracticeLecturePage() {
  const { id } = useParams();
  const [lecture, setLecture] = useState(null);
  const [parts, setParts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState({
    structure: "",
    function: "",
    relations: "",
    blood_supply: "",
    nerve_supply: "",
    bony_landmarks: "",
  });
  const [results, setResults] = useState({});

  // Load lecture and parts
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);

      const { data: lectureData } = await supabase
        .from("lectures")
        .select("*")
        .eq("id", id)
        .single();
      setLecture(lectureData);

      const { data: partsData } = await supabase
        .from("parts")
        .select("*")
        .eq("lecture_id", id)
        .order("created_at", { ascending: false });

      setParts(partsData || []);
      setCurrentIndex(0);
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const currentPart = parts[currentIndex];

  const handleSubmit = () => {
    if (!currentPart) return;
    const newResults = {};
    Object.keys(answers).forEach((key) => {
      const correct = (currentPart[key] || "").trim().toLowerCase();
      const user = (answers[key] || "").trim().toLowerCase();
      newResults[key] = user === correct && correct !== "";
    });
    setResults(newResults);
    setShowResult(true);
  };

  const handleNext = () => {
    if (parts.length === 0) return;
    const next = Math.floor(Math.random() * parts.length);
    setCurrentIndex(next);
    setShowResult(false);
    setResults({});
    setAnswers({
      structure: "",
      function: "",
      relations: "",
      blood_supply: "",
      nerve_supply: "",
      bony_landmarks: "",
    });
  };

  if (loading)
    return <p className="text-center p-8 text-gray-500">Loading...</p>;

  if (!currentPart)
    return (
      <div className="text-center p-8 text-gray-500">
        No parts found for this lecture.
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Practice: {lecture ? lecture.name : "Unknown Lecture"}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LEFT: Image */}
          <div className="flex justify-center items-start">
            <img
              src={currentPart.image_url}
              alt="part"
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg shadow"
            />
          </div>

          {/* RIGHT: Inputs */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col justify-between">
            <div className="space-y-3">
              {Object.keys(answers).map((key) => (
                <div key={key}>
                  <label className="block text-sm font-semibold mb-1 capitalize">
                    {key.replace("_", " ")}
                  </label>
                  <input
                    type="text"
                    value={answers[key]}
                    onChange={(e) =>
                      setAnswers({ ...answers, [key]: e.target.value })
                    }
                    className={`w-full border rounded-lg p-2 ${
                      showResult
                        ? results[key]
                          ? "border-green-500 bg-green-50"
                          : "border-red-500 bg-red-50"
                        : "border-gray-300"
                    }`}
                    placeholder={`Enter ${key.replace("_", " ")}`}
                    disabled={showResult}
                  />
                  {showResult && (
                    <p className="text-xs mt-1 text-gray-600">
                      Correct answer:{" "}
                      <span className="font-medium">
                        {currentPart[key] || "-"}
                      </span>
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center mt-6">
              {!showResult ? (
                <button
                  onClick={handleSubmit}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Submit
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
