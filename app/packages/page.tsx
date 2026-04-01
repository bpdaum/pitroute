"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Logo } from "../components/Logo";
import { AuthWidget } from "../components/AuthWidget";

type PackageType = "INJECTION" | "BRINE" | "SEASONING" | "SAUCE" | "OTHER";
const PACKAGE_TYPES: PackageType[] = ["INJECTION", "BRINE", "SEASONING", "SAUCE", "OTHER"];

export interface RecipePackage {
  id: string;
  name: string;
  packageType: PackageType;
  ingredients: string;
  instructions: string;
}

export default function PackagesPage() {
  const { data: session, status } = useSession();
  const [packages, setPackages] = useState<RecipePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<PackageType>("INJECTION");

  const [editingPkg, setEditingPkg] = useState<Partial<RecipePackage> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/";
    }
  }, [status]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchPackages();
    }
  }, [status]);

  async function fetchPackages() {
    try {
      setLoading(true);
      const res = await fetch("/api/packages");
      if (res.ok) {
        const data = await res.json();
        setPackages(data.packages);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filteredPackages = packages.filter(p => p.packageType === activeTab);

  async function handleSavePackage(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPkg?.name) return;

    setIsSaving(true);
    try {
      const isNew = !editingPkg.id;
      const url = isNew ? "/api/packages" : `/api/packages/${editingPkg.id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingPkg),
      });

      if (res.ok) {
        await fetchPackages();
        setEditingPkg(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this package?")) return;
    try {
      const res = await fetch(`/api/packages/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPackages(prev => prev.filter(p => p.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (status === "loading" || loading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">Loading...</div>;
  }

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] overflow-hidden bg-zinc-950 relative text-white">
      {/* Sidebar */}
      <aside className="hidden md:flex w-[280px] shrink-0 flex-col bg-zinc-900 border-r border-zinc-800 overflow-y-auto">
        <div className="px-5 pt-6 pb-4 border-b border-zinc-800">
          <Link href="/">
             <Logo className="h-8" />
          </Link>
          <p className="text-[10px] text-zinc-600 mt-2 uppercase tracking-widest">Recipe Builder</p>
        </div>
        
        <nav className="p-3 space-y-1 flex-1">
          <Link href="/" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left text-zinc-400 hover:text-white hover:bg-zinc-800 mb-4">
            <span className="text-base leading-none">←</span>
            <span>Back to Discovery</span>
          </Link>

          <p className="text-[10px] uppercase font-bold text-zinc-600 px-3 mt-4 mb-2 tracking-widest">Library</p>
          {PACKAGE_TYPES.map(type => (
            <button
              key={type}
              onClick={() => { setActiveTab(type); setEditingPkg(null); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${activeTab === type
                ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800 border border-transparent"
                }`}
            >
              <span>{type.charAt(0) + type.slice(1).toLowerCase()}s</span>
              <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500">
                {packages.filter(p => p.packageType === type).length}
              </span>
            </button>
          ))}
        </nav>

        <AuthWidget />
      </aside>

      {/* Main Content View */}
      <div className="flex-1 flex flex-col overflow-y-auto relative h-full">
        {/* Mobile Header */}
        <div className="md:hidden px-4 py-3 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center z-10 sticky top-0">
           <Link href="/" className="text-orange-400 text-sm font-bold">← Back</Link>
           <span className="text-sm font-bold uppercase tracking-widest text-zinc-400">{activeTab}S</span>
        </div>

        <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 shrink-0">
          <div className="flex items-center justify-between mb-8">
             <div>
                <h1 className="text-2xl font-bold text-white mb-1">{activeTab.charAt(0) + activeTab.slice(1).toLowerCase()} Packages</h1>
                <p className="text-sm text-zinc-400">Manage your reusable recipes for competitions.</p>
             </div>
             <button
               onClick={() => setEditingPkg({ packageType: activeTab, name: "", ingredients: "", instructions: "" })}
               className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
             >
               + New Recipe
             </button>
          </div>

          {!editingPkg ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPackages.length === 0 ? (
                  <div className="col-span-full py-16 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/50">
                     <span className="text-4xl mb-3 block">📝</span>
                     <p className="text-zinc-400 font-medium">No recipes in this category yet.</p>
                     <p className="text-zinc-500 text-sm mt-1">Click the button above to start your recipe book.</p>
                  </div>
                ) : (
                  filteredPackages.map(pkg => (
                    <div key={pkg.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-colors flex flex-col">
                       <div className="flex justify-between items-start mb-4">
                         <h3 className="font-bold text-lg text-white">{pkg.name}</h3>
                         <div className="flex gap-2">
                           <button onClick={() => setEditingPkg(pkg)} className="text-xs text-zinc-500 hover:text-orange-400 transition-colors">Edit</button>
                           <button onClick={() => handleDelete(pkg.id)} className="text-xs text-zinc-500 hover:text-red-400 transition-colors">Delete</button>
                         </div>
                       </div>
                       
                       {pkg.ingredients && (
                         <div className="mb-4">
                            <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1 font-bold">Ingredients</p>
                            <p className="text-sm text-zinc-300 whitespace-pre-wrap">{pkg.ingredients}</p>
                         </div>
                       )}

                       {pkg.instructions && (
                         <div className="mt-auto pt-4 border-t border-zinc-800/50">
                            <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1 font-bold">Instructions</p>
                            <p className="text-xs text-zinc-400 whitespace-pre-wrap line-clamp-3">{pkg.instructions}</p>
                         </div>
                       )}
                    </div>
                  ))
                )}
             </div>
          ) : (
             <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 fade-in max-w-2xl">
               <div className="flex justify-between items-center mb-6">
                 <h2 className="text-lg font-bold">{editingPkg.id ? "Edit Recipe" : "Create Recipe"}</h2>
                 <button onClick={() => setEditingPkg(null)} className="text-zinc-500 hover:text-white">✕</button>
               </div>

               <form onSubmit={handleSavePackage} className="space-y-4">
                 <div>
                   <label className="block text-xs uppercase tracking-widest text-zinc-500 font-bold mb-2">Recipe Name</label>
                   <input
                     required
                     type="text"
                     value={editingPkg.name || ""}
                     onChange={e => setEditingPkg({ ...editingPkg, name: e.target.value })}
                     placeholder="e.g. Texas Sweet Dust"
                     className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                   />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs uppercase tracking-widest text-zinc-500 font-bold mb-2">Category</label>
                        <select
                          value={editingPkg.packageType || "INJECTION"}
                          onChange={e => setEditingPkg({ ...editingPkg, packageType: e.target.value as PackageType })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-700 transition-colors"
                        >
                          {PACKAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                 </div>

                 <div>
                   <label className="block text-xs uppercase tracking-widest text-zinc-500 font-bold mb-2">Ingredients / Ratios</label>
                   <textarea
                     rows={5}
                     value={editingPkg.ingredients || ""}
                     onChange={e => setEditingPkg({ ...editingPkg, ingredients: e.target.value })}
                     placeholder="1/2 cup brown sugar\n1/4 cup paprika..."
                     className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors resize-y"
                   />
                 </div>

                 <div>
                   <label className="block text-xs uppercase tracking-widest text-zinc-500 font-bold mb-2">Instructions</label>
                   <textarea
                     rows={3}
                     value={editingPkg.instructions || ""}
                     onChange={e => setEditingPkg({ ...editingPkg, instructions: e.target.value })}
                     placeholder="Mix well and apply generously..."
                     className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors resize-y"
                   />
                 </div>

                 <div className="pt-4 flex justify-end gap-3">
                   <button
                     type="button"
                     onClick={() => setEditingPkg(null)}
                     className="px-5 py-2.5 rounded-xl text-sm font-bold text-zinc-400 hover:text-white"
                   >
                     Cancel
                   </button>
                   <button
                     type="submit"
                     disabled={isSaving || !editingPkg.name}
                     className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-900/20 disabled:opacity-50 transition-all"
                   >
                     {isSaving ? "Saving..." : "Save Recipe"}
                   </button>
                 </div>
               </form>
             </div>
          )}
        </div>
      </div>

      {/* Mobile Tab Bar */}
      <nav className="md:hidden flex overflow-x-auto items-center bg-zinc-900 border-t border-zinc-800 shrink-0 pb-safe z-50 relative">
        {PACKAGE_TYPES.map(type => {
          const isActive = activeTab === type;
          return (
            <button
              key={type}
              onClick={() => { setActiveTab(type); setEditingPkg(null); }}
              className={`flex-1 py-4 px-4 whitespace-nowrap transition-colors border-b-2 ${isActive ? "text-orange-400 border-orange-500 bg-orange-500/5" : "text-zinc-500 border-transparent hover:text-zinc-300"
                }`}
            >
              <span className="text-[10px] uppercase font-bold tracking-widest">
                {type}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
