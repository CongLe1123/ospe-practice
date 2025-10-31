"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LecturesPage() {
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newLecture, setNewLecture] = useState("");
  const [creating, setCreating] = useState(false);

  // Fetch all lectures
  useEffect(() => {
    const fetchLectures = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("lectures")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching lectures:", error);
      } else {
        setLectures(data || []);
      }

      setLoading(false);
    };

    fetchLectures();
  }, []);

  // Create a new lecture
  const createLecture = async () => {
    if (!newLecture.trim()) return;
    setCreating(true);

    const { data, error } = await supabase
      .from("lectures")
      .insert({ name: newLecture.trim() })
      .select()
      .single();

    if (error) {
      alert("Error creating lecture: " + error.message);
    } else if (data) {
      setLectures([data, ...lectures]);
      setNewLecture("");
    }

    setCreating(false);
  };

  // Delete a lecture
  const deleteLecture = async (id) => {
    if (!confirm("Are you sure you want to delete this lecture?")) return;

    const { error } = await supabase.from("lectures").delete().eq("id", id);

    if (error) {
      alert("Error deleting lecture: " + error.message);
    } else {
      setLectures(lectures.filter((lec) => lec.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Lectures</h1>

        {/* Create Lecture */}
        <div className="flex gap-2 mb-8">
          <input
            type="text"
            placeholder="Enter lecture name"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={newLecture}
            onChange={(e) => setNewLecture(e.target.value)}
          />
          <button
            onClick={createLecture}
            disabled={creating}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-60"
          >
            {creating ? "..." : "Add"}
          </button>
        </div>

        {/* Lecture List */}
        {loading ? (
          <p className="text-center text-gray-500">Loading lectures...</p>
        ) : lectures.length === 0 ? (
          <p className="text-center text-gray-500">
            No lectures yet. Create one above.
          </p>
        ) : (
          <ul className="space-y-3">
            {lectures.map((lecture) => (
              <li
                key={lecture.id}
                className="bg-white p-4 rounded-lg shadow flex justify-between items-center"
              >
                <div>
                  <h2 className="font-semibold text-lg">{lecture.name}</h2>
                  <p className="text-sm text-gray-500">
                    {new Date(lecture.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`/lectures/${lecture.id}`}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    View Parts
                  </a>
                  <a
                    href={`/practice/${lecture.id}`}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Practice
                  </a>
                  <button
                    onClick={() => deleteLecture(lecture.id)}
                    className="text-red-600 hover:underline text-sm"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
