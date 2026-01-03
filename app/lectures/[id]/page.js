"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Plus,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

export default function LecturePartsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [lecture, setLecture] = useState(null);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingPart, setEditingPart] = useState(null);

  // Single form fields
  const [imageFile, setImageFile] = useState(null);
  const [structure, setStructure] = useState("");
  const [functionText, setFunctionText] = useState("");
  const [relations, setRelations] = useState("");
  const [bloodSupply, setBloodSupply] = useState("");
  const [nerveSupply, setNerveSupply] = useState("");
  const [bonyLandmarks, setBonyLandmarks] = useState("");

  // Batch import state
  const [batchItems, setBatchItems] = useState([]);
  const [isBatchMode, setIsBatchMode] = useState(false);

  const fileInputRef = useRef(null);
  const batchFileInputRef = useRef(null);

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

      const pastedFiles = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            pastedFiles.push(file);
          }
        }
      }

      if (pastedFiles.length > 0) {
        if (isBatchMode) {
          handleFilesSelected(pastedFiles);
        } else if (pastedFiles.length === 1) {
          setImageFile(pastedFiles[0]);
        } else {
          // If multiple images pasted and not in batch mode, switch to batch mode?
          setIsBatchMode(true);
          handleFilesSelected(pastedFiles);
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [isBatchMode, batchItems]);

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

  const handleFilesSelected = (files) => {
    const filesArray = Array.from(files);
    const newItems = filesArray.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      structure: file.name
        ? file.name.split(".").slice(0, -1).join(".")
        : "New Part",
      functionText: "",
      relations: "",
      bloodSupply: "",
      nerveSupply: "",
      bonyLandmarks: "",
      previewUrl: URL.createObjectURL(file),
      imageMatched: true,
    }));
    setBatchItems((prev) => [...prev, ...newItems]);
  };

  const handleMetadataImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        let data = [];

        if (file.name.endsWith(".json")) {
          data = JSON.parse(content);
        } else {
          // Basic CSV Parser
          const lines = content.split("\n").filter((l) => l.trim());
          if (lines.length < 2) return;
          const headers = lines[0]
            .split(",")
            .map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
          data = lines.slice(1).map((line) => {
            const values = line.split(",").map((v) => v.trim());
            const obj = {};
            headers.forEach((header, i) => {
              obj[header] = values[i] || "";
            });
            return obj;
          });
        }

        const updatedBatch = data.map((row) => {
          const imgFileName = row.image_filename || row.image || row.filename;
          const matchingItem = batchItems.find(
            (item) => item.file && item.file.name === imgFileName
          );

          return {
            id: matchingItem?.id || Math.random().toString(36).substr(2, 9),
            file: matchingItem?.file || null,
            previewUrl: matchingItem?.previewUrl || null,
            structure: row.structure || row.name || "New Part",
            functionText: row.function || row.function_text || "",
            relations: row.relations || "",
            bloodSupply: row.blood_supply || row.bloodsupply || "",
            nerveSupply: row.nerve_supply || row.nervesupply || "",
            bonyLandmarks: row.bony_landmarks || row.bonylandmarks || "",
            imageMatched: !!matchingItem,
          };
        });

        // Add any items that were selected as images but not in the CSV
        const unmatchedImages = batchItems.filter(
          (item) =>
            !data.some(
              (row) =>
                (row.image_filename || row.image || row.filename) ===
                item.file?.name
            )
        );

        setBatchItems([...updatedBatch, ...unmatchedImages]);
        alert(`Loaded ${data.length} metadata entries.`);
      } catch (err) {
        console.error(err);
        alert("Error parsing file: " + err.message);
      }
    };
    reader.readAsText(file);
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

  // Batch Upload
  const handleBatchUpload = async () => {
    if (batchItems.length === 0) return;

    // Validate
    if (batchItems.some((item) => !item.structure.trim())) {
      alert("All parts must have a structure name.");
      return;
    }

    const itemsWithImages = batchItems.filter((item) => item.file);
    if (itemsWithImages.length === 0) {
      alert("No images selected for upload.");
      return;
    }

    if (itemsWithImages.length < batchItems.length) {
      if (
        !confirm(
          `Only ${itemsWithImages.length} of ${batchItems.length} items have images. Continue anyway?`
        )
      ) {
        return;
      }
    }

    setUploading(true);
    const newParts = [];

    try {
      for (const item of itemsWithImages) {
        const fileExt = item.file.name
          ? item.file.name.split(".").pop()
          : "png";
        const fileName = `${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 5)}.${fileExt}`;
        const filePath = `parts/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(filePath, item.file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("images")
          .getPublicUrl(filePath);

        const imageUrl = publicUrlData.publicUrl;

        const { data, error: insertError } = await supabase
          .from("parts")
          .insert([
            {
              lecture_id: id,
              image_url: imageUrl,
              structure: item.structure.trim(),
              function: item.functionText || null,
              relations: item.relations || null,
              blood_supply: item.bloodSupply || null,
              nerve_supply: item.nerveSupply || null,
              bony_landmarks: item.bonyLandmarks || null,
            },
          ])
          .select()
          .single();

        if (insertError) throw insertError;
        newParts.push(data);
      }

      setParts([...newParts, ...parts]);
      setBatchItems([]);
      setIsBatchMode(false);
      alert(`Successfully imported ${newParts.length} parts.`);
    } catch (error) {
      console.error(error);
      alert("Error during batch upload: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Start editing
  const handleEdit = (part) => {
    setIsBatchMode(false);
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

    // If a new image was chosen, upload it
    if (imageFile) {
      // Delete the old image from storage if it exists
      if (editingPart.image_url) {
        try {
          const urlParts = editingPart.image_url.split(
            "/storage/v1/object/public/images/"
          );
          if (urlParts.length > 1) {
            const oldPath = urlParts[1];
            await supabase.storage.from("images").remove([oldPath]);
          }
        } catch (storageError) {
          console.error("Error removing old image from storage:", storageError);
        }
      }

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
      .select("*");

    if (error) {
      console.error(error);
      alert("Error updating part: " + error.message);
    } else if (data && data.length > 0) {
      const updatedPart = data[0];
      setParts(parts.map((p) => (p.id === editingPart.id ? updatedPart : p)));
      resetForm();
    } else {
      alert("No data returned from Supabase after update.");
    }

    setUploading(false);
  };

  // Delete part
  const deletePart = async (partId) => {
    if (!confirm("Delete this part?")) return;

    // Find the part to delete to get its image_url
    const partToDelete = parts.find((p) => p.id === partId);

    if (partToDelete && partToDelete.image_url) {
      try {
        // Extract file path from public URL
        // Format: .../storage/v1/object/public/images/parts/filename.png
        const urlParts = partToDelete.image_url.split(
          "/storage/v1/object/public/images/"
        );
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage.from("images").remove([filePath]);
        }
      } catch (storageError) {
        console.error("Error deleting image from storage:", storageError);
      }
    }

    const { error } = await supabase.from("parts").delete().eq("id", partId);
    if (error) alert("Error deleting part: " + error.message);
    else setParts(parts.filter((p) => p.id !== partId));
  };

  if (loading)
    return <p className="text-center text-gray-500 p-8">Loading...</p>;
  if (!lecture)
    return <p className="text-center text-red-500 p-8">Lecture not found.</p>;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 text-foreground animate-fade-in">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div className="flex items-center gap-4">
            <Link href="/lectures">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-muted transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-primary">
                {lecture.name}
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage body parts and anatomical details
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-sm border">
            <Button
              variant={!isBatchMode ? "primary" : "ghost"}
              onClick={() => setIsBatchMode(false)}
              className={!isBatchMode ? "shadow-md" : "text-muted-foreground"}
            >
              Single Upload
            </Button>
            <Button
              variant={isBatchMode ? "primary" : "ghost"}
              onClick={() => setIsBatchMode(true)}
              className={isBatchMode ? "shadow-md" : "text-muted-foreground"}
            >
              Bulk Import
            </Button>
          </div>
        </div>

        {/* Upload / Edit Form */}
        {!isBatchMode ? (
          <Card className="glass-card overflow-hidden border-none shadow-xl">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary rounded-lg text-white">
                  {editingPart ? (
                    <FileText className="w-5 h-5" />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-xl">
                    {editingPart ? "Edit Part" : "Add New Part"}
                  </CardTitle>
                  <CardDescription>
                    Enter the details for the specific anatomical structure
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <form
                onSubmit={editingPart ? handleUpdate : handleUpload}
                className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start"
              >
                {/* Left: Image Preview + Drop Area */}
                <div className="space-y-4">
                  <div
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        setImageFile(e.dataTransfer.files[0]);
                      }
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    className="group relative border-2 border-dashed border-muted-foreground/25 rounded-2xl p-4 text-center bg-gray-50/50 hover:bg-white hover:border-accent transition-all duration-300 min-h-[350px] flex items-center justify-center cursor-pointer overflow-hidden shadow-inner"
                    onClick={() => fileInputRef.current.click()}
                  >
                    {imageFile ? (
                      <img
                        src={URL.createObjectURL(imageFile)}
                        alt="preview"
                        className="max-h-[400px] w-auto object-contain rounded-xl shadow-lg border-2 border-white"
                      />
                    ) : editingPart?.image_url ? (
                      <img
                        src={editingPart.image_url}
                        alt={editingPart.structure}
                        className="max-h-[400px] w-auto object-contain rounded-xl shadow-lg border-2 border-white"
                      />
                    ) : (
                      <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                        <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center group-hover:bg-accent/10 group-hover:text-accent transition-colors">
                          <ImageIcon className="w-8 h-8 text-muted-foreground group-hover:text-accent" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold">
                            Drop image here
                          </p>
                          <p className="text-xs text-muted-foreground">
                            or click to browse from files
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-normal"
                        >
                          Ctrl+V to Paste
                        </Badge>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files[0])}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Right: Form Fields */}
                <div className="space-y-5">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="structure">Structure Name *</Label>
                      <Input
                        id="structure"
                        placeholder="e.g. Left Ventricle"
                        value={structure}
                        onChange={(e) => setStructure(e.target.value)}
                        required
                        className="h-11 rounded-xl"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="function">Function</Label>
                      <Input
                        id="function"
                        placeholder="What is its primary role?"
                        value={functionText}
                        onChange={(e) => setFunctionText(e.target.value)}
                        className="h-11 rounded-xl"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="relations">Relations</Label>
                      <Input
                        id="relations"
                        placeholder="Neighboring structures..."
                        value={relations}
                        onChange={(e) => setRelations(e.target.value)}
                        className="h-11 rounded-xl"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="blood">Blood Supply</Label>
                        <Input
                          id="blood"
                          placeholder="Arteries/Veins"
                          value={bloodSupply}
                          onChange={(e) => setBloodSupply(e.target.value)}
                          className="h-11 rounded-xl"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="nerve">Nerve Supply</Label>
                        <Input
                          id="nerve"
                          placeholder="Innervation..."
                          value={nerveSupply}
                          onChange={(e) => setNerveSupply(e.target.value)}
                          className="h-11 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="landmarks">Bony Landmarks</Label>
                      <Input
                        id="landmarks"
                        placeholder="Associated bone features..."
                        value={bonyLandmarks}
                        onChange={(e) => setBonyLandmarks(e.target.value)}
                        className="h-11 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      disabled={uploading}
                      className="flex-1 h-12 text-base font-semibold shadow-lg hover:shadow-accent/20 transition-all rounded-xl"
                    >
                      {uploading ? (
                        <span className="flex items-center gap-2">
                          <Upload className="w-4 h-4 animate-bounce" />{" "}
                          Saving...
                        </span>
                      ) : editingPart ? (
                        "Update Part"
                      ) : (
                        "Upload Part"
                      )}
                    </Button>
                    {editingPart && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetForm}
                        className="h-12 px-6 rounded-xl"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          /* Bulk Import Section */
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card
                className="group relative border-2 border-dashed border-primary/20 hover:border-primary bg-primary/5 transition-all p-8 text-center cursor-pointer rounded-2xl"
                onClick={() => batchFileInputRef.current.click()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files) {
                    handleFilesSelected(e.dataTransfer.files);
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
              >
                <div className="space-y-4">
                  <div className="mx-auto w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                    <ImageIcon className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-primary">
                      1. Images
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Drag multiple images or click to select
                    </p>
                  </div>
                </div>
                <input
                  ref={batchFileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFilesSelected(e.target.files)}
                  className="hidden"
                />
              </Card>

              <Card
                className="group relative border-2 border-dashed border-accent/20 hover:border-accent bg-accent/5 transition-all p-8 text-center cursor-pointer rounded-2xl"
                onClick={() => document.getElementById("metaInput").click()}
              >
                <div className="space-y-4">
                  <div className="mx-auto w-14 h-14 bg-accent text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-accent">
                      2. Metadata
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Load CSV or JSON to auto-fill details
                    </p>
                  </div>
                </div>
                <input
                  id="metaInput"
                  type="file"
                  accept=".csv,.json"
                  onChange={handleMetadataImport}
                  className="hidden"
                />
                <div className="mt-4 flex flex-wrap justify-center gap-1">
                  {[
                    "structure",
                    "function",
                    "blood_supply",
                    "image_filename",
                  ].map((col) => (
                    <Badge
                      key={col}
                      variant="outline"
                      className="text-[9px] bg-white/50"
                    >
                      {col}
                    </Badge>
                  ))}
                  <Badge variant="outline" className="text-[9px] bg-white/50">
                    + more
                  </Badge>
                </div>
              </Card>
            </div>

            {batchItems.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    Review Batch{" "}
                    <Badge variant="secondary">{batchItems.length}</Badge>
                  </h3>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setBatchItems([])}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      Clear Selection
                    </Button>
                    <Button
                      onClick={handleBatchUpload}
                      disabled={uploading}
                      className="bg-accent hover:bg-accent/90 shadow-lg"
                    >
                      {uploading
                        ? "Processing..."
                        : `Import ${
                            batchItems.filter((i) => i.file).length
                          } Items`}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {batchItems.map((item, index) => (
                    <Card
                      key={item.id}
                      className={`overflow-hidden transition-all duration-300 border shadow-sm ${
                        item.imageMatched
                          ? "hover:shadow-md"
                          : "border-red-200 bg-red-50/30"
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row gap-6">
                          <div className="w-full md:w-40 h-40 flex-shrink-0 relative">
                            {item.previewUrl ? (
                              <img
                                src={item.previewUrl}
                                alt="preview"
                                className="w-full h-full object-cover rounded-xl border bg-white shadow-sm"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-muted rounded-xl border border-dashed text-muted-foreground p-3 text-center">
                                <AlertCircle className="w-6 h-6 mb-2 text-red-400" />
                                <span className="text-[10px] font-bold uppercase tracking-tight">
                                  Image Missing
                                </span>
                                <span className="text-[9px] mt-1 break-all line-clamp-2">
                                  {item.structure}
                                </span>
                              </div>
                            )}
                            {!item.imageMatched && (
                              <Badge className="absolute -top-2 -right-2 bg-red-600 shadow-md">
                                Unmatched
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setBatchItems(
                                  batchItems.filter((i) => i.id !== item.id)
                                )
                              }
                              className="absolute -top-2 -left-2 bg-white rounded-full shadow-sm w-8 h-8 hover:bg-red-50 hover:text-red-500 border"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="col-span-full">
                              <Label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                                Structure *
                              </Label>
                              <Input
                                value={item.structure}
                                onChange={(e) => {
                                  const newBatch = [...batchItems];
                                  newBatch[index].structure = e.target.value;
                                  setBatchItems(newBatch);
                                }}
                                className="h-9 border-muted-foreground/20 focus-visible:ring-primary"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                                Function
                              </Label>
                              <Input
                                value={item.functionText}
                                onChange={(e) => {
                                  const newBatch = [...batchItems];
                                  newBatch[index].functionText = e.target.value;
                                  setBatchItems(newBatch);
                                }}
                                className="h-9 border-muted-foreground/20"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                                Relations
                              </Label>
                              <Input
                                value={item.relations}
                                onChange={(e) => {
                                  const newBatch = [...batchItems];
                                  newBatch[index].relations = e.target.value;
                                  setBatchItems(newBatch);
                                }}
                                className="h-9 border-muted-foreground/20"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                                Blood
                              </Label>
                              <Input
                                value={item.bloodSupply}
                                onChange={(e) => {
                                  const newBatch = [...batchItems];
                                  newBatch[index].bloodSupply = e.target.value;
                                  setBatchItems(newBatch);
                                }}
                                className="h-9 border-muted-foreground/20"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                                Nerve
                              </Label>
                              <Input
                                value={item.nerveSupply}
                                onChange={(e) => {
                                  const newBatch = [...batchItems];
                                  newBatch[index].nerveSupply = e.target.value;
                                  setBatchItems(newBatch);
                                }}
                                className="h-9 border-muted-foreground/20"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] font-bold text-muted-foreground uppercase mb-1 block">
                                Landmarks
                              </Label>
                              <Input
                                value={item.bonyLandmarks}
                                onChange={(e) => {
                                  const newBatch = [...batchItems];
                                  newBatch[index].bonyLandmarks =
                                    e.target.value;
                                  setBatchItems(newBatch);
                                }}
                                className="h-9 border-muted-foreground/20"
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Parts List */}
        <div className="pt-10">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
              Course Contents
            </h2>
            <Badge
              variant="outline"
              className="bg-primary/5 text-primary border-primary/20 text-sm py-1 px-3"
            >
              {parts.length} Parts Loaded
            </Badge>
          </div>

          {parts.length === 0 ? (
            <Alert className="bg-muted/50 border-none shadow-inner p-12 flex flex-col items-center justify-center">
              <ImageIcon className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
              <AlertTitle className="text-muted-foreground font-semibold">
                No parts found
              </AlertTitle>
              <AlertDescription className="text-muted-foreground/70">
                Start by adding a single structure or using the bulk import
                tool.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {parts.map((part) => (
                <Card
                  key={part.id}
                  className="group bg-white overflow-hidden rounded-2xl shadow-sm border-none hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300"
                >
                  <div className="relative h-56 w-full overflow-hidden bg-muted group-hover:bg-primary/5 transition-colors">
                    <img
                      src={part.image_url}
                      alt={part.structure}
                      className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-4 right-4 translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 flex flex-col gap-2">
                      <Button
                        size="icon"
                        variant="primary"
                        className="h-9 w-9 rounded-full shadow-lg"
                        onClick={() => handleEdit(part)}
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-9 w-9 rounded-full shadow-lg"
                        onClick={() => deletePart(part.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <Badge
                      variant="secondary"
                      className="mb-2 bg-primary/10 text-primary border-none text-[10px] font-bold uppercase tracking-widest"
                    >
                      Structure
                    </Badge>
                    <h3 className="font-bold text-xl text-foreground mb-2 group-hover:text-primary transition-colors">
                      {part.structure}
                    </h3>
                    {part.function && (
                      <p className="text-sm text-muted-foreground line-clamp-2 italic leading-relaxed">
                        "{part.function}"
                      </p>
                    )}

                    <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
                      {part.blood_supply && (
                        <Badge
                          variant="outline"
                          className="text-[9px] bg-red-50 text-red-600 border-red-200"
                        >
                          Arterial
                        </Badge>
                      )}
                      {part.nerve_supply && (
                        <Badge
                          variant="outline"
                          className="text-[9px] bg-blue-50 text-blue-600 border-blue-200"
                        >
                          Nervous
                        </Badge>
                      )}
                      {part.relations && (
                        <Badge
                          variant="outline"
                          className="text-[9px] bg-green-50 text-green-600 border-green-200"
                        >
                          Relational
                        </Badge>
                      )}
                    </div>

                    <div className="flex justify-between items-center mt-6 pt-4 border-t border-dashed">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(part)}
                        className="text-primary font-bold text-xs"
                      >
                        FULL DETAILS
                      </Button>
                      <div className="flex items-center gap-1 text-muted-foreground/30">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
