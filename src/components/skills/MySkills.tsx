"use client";

import axios from "axios";
import Image from "next/image";
import { useEffect, useState } from "react";

interface SkillItem {
  name: string;
  logo: string;
}

interface SkillsData {
  frontend?: SkillItem[];
  backend?: SkillItem[];
  others?: SkillItem[];
}

export default function MySkills() {
  const [skills, setSkills] = useState<SkillsData[]>([]);

  const getSkills = async () => {
    try {
      const response = await axios.get<SkillsData[]>("/skiils.json");
      setSkills(response.data);
    } catch (err) {
      console.error("Failed to load skills:", err);
    }
  };

  useEffect(() => {
    getSkills();
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-center">My Skills</h2>
      <div className="space-y-8">
        {skills.map((section, index) => {
          const category = Object.keys(section)[0] as keyof SkillsData;
          const items = section[category];

          if (!items) return null;

          return (
            <div key={index}>
              <h3 className="text-xl font-semibold capitalize mb-4 text-ws-primary">
                {category}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-md shadow-md bg-ws-primary hover:bg-gray-800 duration-300 text-white overflow-hidden hover:shadow-md"
                  >
                    <Image
                      src={item.logo}
                      alt={item.name}
                      width={24}
                      height={24}
                      className="w-16 h-16 p-3 bg-white"
                    />
                    <span>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
