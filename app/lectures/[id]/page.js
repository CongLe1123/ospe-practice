"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LecturePartsPage() {
  const params = useParams();
  const id = params?.id;

  const [lecture, setLecture] = useState(null);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingPart, setEditingPart] = useState(null); // 👈 new

  // Form fields
  const [imageFile, setImageFile] = useState(null);
  const [structure, setStructure] = useState("");
  const [functionText, setFunctionText] = useState("");
  const [relations, setRelations] = useState("");
  const [bloodSupply, setBloodSupply] = useState("");
  const [nerveSupply, setNerveSupply] = useState("");
  const [bonyLandmarks, setBonyLandmarks] = useState("");

  const fileInputRef = useRef(null);

  // Fetch lecture and parts
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

      const { data: partsData, error } = await supabase
        .from("parts")
        .select("*")
        .eq("lecture_id", id)
        .order("created_at", { ascending: false });

      if (error) console.error(error);
      setParts(partsData || []);
      setLoading(false);
    };

    fetchData();
  }, [id]);

  // Paste image support
  useEffect(() => {
    const handlePaste = (event) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            setImageFile(file);
          }
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, []);

  // Reset form
  const resetForm = () => {
    setImageFile(null);
    setStructure("");
    setFunctionText("");
    setRelations("");
    setBloodSupply("");
    setNerveSupply("");
    setBonyLandmarks("");
    setEditingPart(null);
  };

  // Upload new part
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!imageFile || !structure.trim()) {
      alert("Image and structure name are required.");
      return;
    }

    setUploading(true);

    const fileExt = imageFile.name ? imageFile.name.split(".").pop() : "png";
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `parts/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(filePath, imageFile);

    if (uploadError) {
      alert("Image upload failed: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("images")
      .getPublicUrl(filePath);

    const imageUrl = publicUrlData.publicUrl;

    const { data, error } = await supabase
      .from("parts")
      .insert([
        {
          lecture_id: id,
          image_url: imageUrl,
          structure: structure.trim(),
          function: functionText || null,
          relations: relations || null,
          blood_supply: bloodSupply || null,
          nerve_supply: nerveSupply || null,
          bony_landmarks: bonyLandmarks || null,
        },
      ])
      .select()
      .single();

    if (error) {
      alert("Error saving part: " + error.message);
    } else {
      setParts([data, ...parts]);
      resetForm();
    }

    setUploading(false);
  };

  // Start editing
  const handleEdit = (part) => {
    setEditingPart(part);
    setStructure(part.structure || "");
    setFunctionText(part.function || "");
    setRelations(part.relations || "");
    setBloodSupply(part.blood_supply || "");
    setNerveSupply(part.nerve_supply || "");
    setBonyLandmarks(part.bony_landmarks || "");
    setImageFile(null);
  };

  // Update part
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingPart) return;

    setUploading(true);

    let imageUrl = editingPart.image_url;

    // if user uploaded a new image, upload and replace URL
    if (imageFile) {
      const fileExt = imageFile.name ? imageFile.name.split(".").pop() : "png";
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `parts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(filePath, imageFile);

      if (uploadError) {
        alert("Image upload failed: " + uploadError.message);
        setUploading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("images")
        .getPublicUrl(filePath);

      imageUrl = publicUrlData.publicUrl;
    }

    const { data, error } = await supabase
      .from("parts")
      .update({
        image_url: imageUrl,
        structure: structure.trim(),
        function: functionText || null,
        relations: relations || null,
        blood_supply: bloodSupply || null,
        nerve_supply: nerveSupply || null,
        bony_landmarks: bonyLandmarks || null,
      })
      .eq("id", editingPart.id)
      .select()
      .single();

    if (error) {
      alert("Error updating part: " + error.message);
    } else {
      setParts(parts.map((p) => (p.id === editingPart.id ? data : p)));
      resetForm();
    }

    setUploading(false);
  };

  // Delete part
  const deletePart = async (partId) => {
    if (!confirm("Delete this part?")) return;
    const { error } = await supabase.from("parts").delete().eq("id", partId);
    if (error) alert("Error deleting part: " + error.message);
    else setParts(parts.filter((p) => p.id !== partId));
  };

  if (loading)
    return <p className="text-center text-gray-500 p-8">Loading...</p>;
  if (!lecture)
    return <p className="text-center text-red-500 p-8">Lecture not found.</p>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">{lecture.name}</h1>

        {/* Upload / Edit Form */}
        <form
          onSubmit={editingPart ? handleUpdate : handleUpload}
          className="bg-white p-6 rounded-lg shadow mb-10"
        >
          <h2 className="text-xl font-semibold mb-4">
            {editingPart ? "Edit Part" : "Add New Part"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Left: Image Preview + Drop Area */}
            <div
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  setImageFile(e.dataTransfer.files[0]);
                }
              }}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50 hover:border-blue-400 transition min-h-[300px] flex items-center justify-center"
            >
              {imageFile ? (
                <img
                  src={URL.createObjectURL(imageFile)}
                  alt="preview"
                  className="max-h-[400px] w-auto object-contain rounded-md"
                />
              ) : editingPart?.image_url ? (
                <img
                  src={editingPart.image_url}
                  alt={editingPart.structure}
                  className="max-h-[400px] w-auto object-contain rounded-md"
                />
              ) : (
                <p className="text-gray-500 text-sm">
                  📸 Paste (<strong>Ctrl+V</strong>), drop, or choose an image
                </p>
              )}
            </div>

            {/* Right: Form Fields */}
            <div className="space-y-3">
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Choose Image File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files[0])}
                  className="hidden"
                />
              </div>

              <input
                type="text"
                placeholder="Structure name"
                value={structure}
                onChange={(e) => setStructure(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2"
                required
              />
              <input
                type="text"
                placeholder="Function"
                value={functionText}
                onChange={(e) => setFunctionText(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2"
              />
              <input
                type="text"
                placeholder="Relations"
                value={relations}
                onChange={(e) => setRelations(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2"
              />
              <input
                type="text"
                placeholder="Blood supply"
                value={bloodSupply}
                onChange={(e) => setBloodSupply(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2"
              />
              <input
                type="text"
                placeholder="Nerve supply"
                value={nerveSupply}
                onChange={(e) => setNerveSupply(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2"
              />
              <input
                type="text"
                placeholder="Bony landmarks"
                value={bonyLandmarks}
                onChange={(e) => setBonyLandmarks(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2"
              />

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-60"
                >
                  {uploading
                    ? "Saving..."
                    : editingPart
                    ? "Update Part"
                    : "Upload Part"}
                </button>
                {editingPart && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="bg-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Parts List */}
        <h2 className="text-2xl font-semibold mb-4">Parts</h2>
        {parts.length === 0 ? (
          <p className="text-gray-500">No parts yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {parts.map((part) => (
              <div key={part.id} className="bg-white p-4 rounded-lg shadow">
                <img
                  src={part.image_url}
                  alt={part.structure}
                  className="w-full h-40 object-cover rounded-md"
                />
                <h3 className="font-semibold text-lg mt-2">{part.structure}</h3>
                {part.function && (
                  <p className="text-sm text-gray-600">
                    <strong>Function:</strong> {part.function}
                  </p>
                )}
                <div className="flex justify-between mt-2 text-sm">
                  <button
                    onClick={() => handleEdit(part)}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deletePart(part.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
