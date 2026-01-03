"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Shuffle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  BrainCircuit,
  Lightbulb,
} from "lucide-react";

export default function PracticeLecturePage() {
  const router = useRouter();
  const { id } = useParams();
  const [lecture, setLecture] = useState(null);
  const [parts, setParts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [isRandom, setIsRandom] = useState(false);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState({});

  const currentPart = parts[currentIndex];

  // Initialize answers whenever currentPart changes
  useEffect(() => {
    if (currentPart) {
      const initialAnswers = {};
      [
        "structure",
        "function",
        "relations",
        "blood_supply",
        "nerve_supply",
        "bony_landmarks",
      ].forEach((key) => {
        const count = (currentPart[key] || "")
          .split("|")
          .filter(Boolean).length;
        initialAnswers[key] = Array(count).fill("");
      });
      setAnswers(initialAnswers);
      setResults({});
      setShowResult(false);
    }
  }, [currentPart]);

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
        .order("created_at", { ascending: true });

      setParts(partsData || []);
      setCurrentIndex(0);
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!currentPart) return;
    const newResults = {};
    Object.keys(answers).forEach((key) => {
      const correctValues = (currentPart[key] || "")
        .split("|")
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean);
      const userValues = (answers[key] || []).map((v) =>
        v.trim().toLowerCase()
      );

      // Check if the set of user values matches the set of correct values
      const allCorrect =
        correctValues.length === userValues.length &&
        correctValues.every((val) => userValues.includes(val)) &&
        userValues.every((val) => correctValues.includes(val));

      newResults[key] = allCorrect;
    });
    setResults(newResults);
    setShowResult(true);
  };

  const handlePaste = (key, index, e) => {
    const pasteData = e.clipboardData.getData("text");
    if (pasteData.includes("\n")) {
      e.preventDefault();
      const lines = pasteData
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length > 0) {
        const newValues = [...(answers[key] || [])];
        // Distribute lines into existing input slots
        for (let i = 0; i < lines.length && index + i < newValues.length; i++) {
          newValues[index + i] = lines[i];
        }
        setAnswers({ ...answers, [key]: newValues });
      }
    }
  };

  const handleNext = () => {
    if (parts.length === 0) return;
    let nextIndex;
    if (isRandom) {
      nextIndex = Math.floor(Math.random() * parts.length);
      // Avoid same index if more than 1 part
      if (parts.length > 1 && nextIndex === currentIndex) {
        nextIndex = (nextIndex + 1) % parts.length;
      }
    } else {
      nextIndex = (currentIndex + 1) % parts.length;
    }

    setCurrentIndex(nextIndex);
    // Answers will be reset by the useEffect watching currentPart
  };

  if (loading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-muted-foreground font-medium">
          Preparing your session...
        </p>
      </div>
    );

  if (!currentPart)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8 text-center space-y-6">
        <div className="p-6 bg-muted rounded-full">
          <BrainCircuit className="w-12 h-12 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">No anatomical parts found</h2>
          <p className="text-muted-foreground mt-2">
            This lecture doesn't have any images to practice with yet.
          </p>
        </div>
        <Button
          onClick={() => router.back()}
          variant="outline"
          className="rounded-xl px-8 h-12"
        >
          Go Back
        </Button>
      </div>
    );

  const visibleFields = Object.keys(answers).filter(
    (key) => (currentPart?.[key] || "").trim() !== ""
  );

  const progress = ((currentIndex + 1) / parts.length) * 100;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 text-foreground animate-fade-in">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b pb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="rounded-full hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-primary">
                {lecture?.name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="secondary"
                  className="bg-primary/5 text-primary border-none"
                >
                  Practice Session
                </Badge>
                <div className="flex items-center text-muted-foreground text-sm font-medium">
                  Part
                  <select
                    value={currentIndex}
                    onChange={(e) => {
                      setCurrentIndex(Number(e.target.value));
                      setShowResult(false);
                      setResults({});
                    }}
                    className="mx-1.5 bg-muted/50 hover:bg-muted px-2 py-0.5 rounded-md border-none focus:ring-1 focus:ring-primary cursor-pointer transition-colors"
                  >
                    {parts.map((_, idx) => (
                      <option key={idx} value={idx}>
                        {idx + 1}
                      </option>
                    ))}
                  </select>
                  of {parts.length}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-1 bg-muted/30 rounded-2xl border">
            <Button
              variant={!isRandom ? "primary" : "ghost"}
              onClick={() => setIsRandom(false)}
              size="sm"
              className={
                !isRandom
                  ? "shadow-sm rounded-xl"
                  : "text-muted-foreground rounded-xl"
              }
            >
              Order List
            </Button>
            <Button
              variant={isRandom ? "primary" : "ghost"}
              onClick={() => setIsRandom(true)}
              size="sm"
              className={
                isRandom
                  ? "shadow-sm rounded-xl"
                  : "text-muted-foreground rounded-xl"
              }
            >
              <Shuffle className="w-3.5 h-3.5 mr-2" /> Shuffle
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          {/* LEFT: Image */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
            <Card className="overflow-hidden border-none shadow-2xl rounded-3xl bg-white p-4 group flex flex-col h-full">
              <div className="relative flex-1 rounded-2xl overflow-hidden bg-muted flex items-center justify-center min-h-[400px]">
                <img
                  src={currentPart.image_url}
                  alt="anatomical structure"
                  className="absolute inset-0 w-full h-full object-contain object-center group-hover:scale-[1.02] transition-transform duration-700 p-4"
                />
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
              </div>
              <div className="mt-4 px-2 flex-shrink-0">
                <Progress value={progress} className="h-2 rounded-full" />
                <div className="flex justify-between mt-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT: Inputs */}
          <Card className="lg:col-span-5 xl:col-span-4 border-none shadow-xl rounded-3xl overflow-hidden glass-card flex flex-col h-[650px]">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary rounded-lg text-white">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <CardTitle className="text-xl">Identification</CardTitle>
              </div>
            </CardHeader>

            <CardContent className="p-8 flex-1 overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
                {visibleFields.map((key) => (
                  <div key={key} className="space-y-2 group">
                    <label className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest block ml-1">
                      {key.replace("_", " ")}
                    </label>
                    {(() => {
                      const rawCorrectParts = (currentPart[key] || "")
                        .split("|")
                        .map((v) => v.trim())
                        .filter(Boolean);
                      const correctValuesLookup = rawCorrectParts.map((v) =>
                        v.toLowerCase()
                      );

                      return (
                        <div className="space-y-3">
                          {answers[key]?.map((value, idx) => {
                            const isThisCorrect = correctValuesLookup.includes(
                              value.trim().toLowerCase()
                            );

                            return (
                              <div key={idx} className="space-y-1">
                                <div className="relative">
                                  <Input
                                    type="text"
                                    value={value}
                                    onChange={(e) => {
                                      const newValues = [...answers[key]];
                                      newValues[idx] = e.target.value;
                                      setAnswers({
                                        ...answers,
                                        [key]: newValues,
                                      });
                                    }}
                                    onPaste={(e) => handlePaste(key, idx, e)}
                                    className={`h-12 rounded-xl text-base transition-all ${
                                      showResult
                                        ? isThisCorrect
                                          ? "border-green-500 bg-green-50 ring-green-100 pr-10"
                                          : "border-red-500 bg-red-50 ring-red-100 pr-10"
                                        : "border-muted-foreground/20 focus-visible:ring-primary shadow-inner"
                                    }`}
                                    placeholder={`Part ${idx + 1}...`}
                                    disabled={showResult}
                                    autoFocus={key === "structure" && idx === 0}
                                  />
                                  {showResult && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                      {isThisCorrect ? (
                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                      ) : (
                                        <XCircle className="w-5 h-5 text-red-600" />
                                      )}
                                    </div>
                                  )}
                                </div>
                                {showResult && !isThisCorrect && (
                                  <div className="animate-in fade-in slide-in-from-top-1 duration-300">
                                    <Badge
                                      variant="outline"
                                      className="border-red-200 text-red-600 bg-white shadow-sm px-3 py-2 font-medium text-xs whitespace-normal break-words text-left w-full h-auto block rounded-xl"
                                    >
                                      {rawCorrectParts[idx]}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                ))}

                {/* Hidden submit button to allow Enter key to work */}
                <button type="submit" className="hidden"></button>
              </form>
            </CardContent>

            <CardFooter className="p-8 bg-muted/20 border-t">
              {!showResult ? (
                <Button
                  onClick={handleSubmit}
                  className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98]"
                >
                  Check Answers
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  className="w-full h-14 rounded-2xl bg-accent hover:bg-accent/90 text-white font-bold text-lg shadow-lg hover:shadow-accent/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  Next Question <ArrowRight className="w-5 h-5" />
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
