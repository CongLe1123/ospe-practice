"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Eye, Play, GraduationCap } from "lucide-react";
import Link from "next/link";

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
    if (
      !confirm(
        "Are you sure you want to delete this lecture? This will also remove all associated images."
      )
    )
      return;

    // 1. Fetch all parts for this lecture to get their image URLs
    const { data: partsToDelete, error: fetchError } = await supabase
      .from("parts")
      .select("image_url")
      .eq("lecture_id", id);

    if (fetchError) {
      console.error("Error fetching parts for deletion:", fetchError);
    } else if (partsToDelete && partsToDelete.length > 0) {
      // 2. Extract paths and delete from storage
      const pathsToDelete = partsToDelete
        .map((p) => {
          if (!p.image_url) return null;
          const urlParts = p.image_url.split(
            "/storage/v1/object/public/images/"
          );
          return urlParts.length > 1 ? urlParts[1] : null;
        })
        .filter(Boolean);

      if (pathsToDelete.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("images")
          .remove(pathsToDelete);
        if (storageError) {
          console.error("Error deleting images from storage:", storageError);
        }
      }
    }

    // 3. Delete the lecture record (Postgres should cascade delete parts)
    const { error } = await supabase.from("lectures").delete().eq("id", id);

    if (error) {
      alert("Error deleting lecture: " + error.message);
    } else {
      setLectures(lectures.filter((lec) => lec.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 animate-fade-in text-foreground">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4 pt-10">
          <div className="inline-flex p-3 bg-primary/10 rounded-2xl text-primary mb-2">
            <GraduationCap className="w-10 h-10" />
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-primary">
            Anatomy Hub
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Create and manage your anatomy collections for OSPE practice.
          </p>
        </div>

        {/* Create Lecture Section */}
        <Card className="glass-card border-none shadow-xl overflow-hidden max-w-2xl mx-auto rounded-3xl">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Name your new lecture collection..."
                className="h-12 text-base rounded-2xl border-muted-foreground/20 focus-visible:ring-primary shadow-inner"
                value={newLecture}
                onChange={(e) => setNewLecture(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createLecture()}
              />
              <Button
                onClick={createLecture}
                disabled={creating || !newLecture.trim()}
                className="h-12 px-8 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl shadow-lg hover:shadow-primary/20 transition-all flex items-center gap-2"
              >
                {creating ? (
                  "..."
                ) : (
                  <>
                    <Plus className="w-5 h-5" /> Add Collection
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lecture List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl font-bold">Your Collections</h2>
            <Badge
              variant="outline"
              className="px-3 py-1 font-bold text-sm bg-white/50"
            >
              {lectures.length} Total
            </Badge>
          </div>

          {loading ? (
            <div className="text-center p-20">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground font-medium">
                Loading your collections...
              </p>
            </div>
          ) : lectures.length === 0 ? (
            <Card className="border-2 border-dashed border-muted-foreground/20 bg-muted/20 rounded-3xl p-12 text-center text-muted-foreground">
              <p>
                No collections yet. Start by creating your first anatomical
                lecture above.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {lectures.map((lecture) => (
                <Card
                  key={lecture.id}
                  className="group bg-white rounded-3xl border-none shadow hover:shadow-2xl hover:translate-y-[-4px] transition-all duration-300"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors line-clamp-1">
                      {lecture.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      Created on{" "}
                      {new Date(lecture.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 flex flex-col gap-3">
                    <div className="flex gap-2">
                      <Link href={`/lectures/${lecture.id}`} className="flex-1">
                        <Button
                          variant="outline"
                          className="w-full h-11 rounded-xl flex items-center gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary hover:border-primary transition-all font-semibold"
                        >
                          <Eye className="w-4 h-4" /> Edit Content
                        </Button>
                      </Link>
                      <Link href={`/practice/${lecture.id}`} className="flex-1">
                        <Button className="w-full h-11 rounded-xl bg-accent hover:bg-accent/90 text-white flex items-center gap-2 shadow-lg hover:shadow-accent/20 transition-all font-semibold">
                          <Play className="w-4 h-4" /> Start Practice
                        </Button>
                      </Link>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteLecture(lecture.id)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 flex items-center gap-2 w-fit mx-auto mt-2"
                    >
                      <Trash2 className="w-4 h-4" /> Delete Collection
                    </Button>
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
