"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ keyword: 'rimuru', categories: [4, 11, 11, 11], subcategories: [20, 54, 25, 26] }),
        });
        const data = await res.json();
        setData(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();
  }, []);

  if (!data) {
    return <div>Loading...</div>;
  }

  return (
    <main className="flex h-full w-full">
      <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}