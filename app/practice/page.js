"use client";

import React, { useState, useEffect } from "react";
import { redirect } from "next/navigation";

function Page() {
  const [countdown, setCountdown] = useState(5); // Start at 5 seconds

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prevCountdown) => prevCountdown - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (countdown === 0) {
      redirect("/lectures");
    }
  }, [countdown]);

  return (
    <div>
      <h1>Redirecting in... {countdown} seconds</h1>
      <p>
        No parts id found, redirect to lectures page in {countdown} seconds.
      </p>
    </div>
  );
}

export default Page;
