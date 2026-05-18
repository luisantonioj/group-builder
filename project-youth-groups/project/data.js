// Mock data for Shepherd's Grouping System
// 48 candidates with intentional connection clusters (schools, families, barkadas)

window.MOCK_BATCH = "YE #19";

// Generate candidates
window.MOCK_CANDIDATES = [
  // Cluster 1 — DLSL classmates barkada (school-based, will conflict if grouped together)
  { id: "c01", lastName: "Reyes",     firstName: "Patricia Anne", gender: "F", age: 17, school: "De La Salle Lipa",     inviter: "Mark Villanueva (BLD member)", contact: "0917-234-1801", facebook: "patricia.reyes", address: "Brgy. Sabang, Lipa City", birthday: "2008-03-12", allergies: "Peanuts", father: "Mario Reyes / 0917-100-2301", mother: "Liza Reyes / 0917-100-2302", heard: "Friend invited me", joined: "2026-04-12 19:22" },
  { id: "c02", lastName: "Santos",    firstName: "Joaquin",       gender: "M", age: 18, school: "De La Salle Lipa",     inviter: "Patricia Anne Reyes", contact: "0917-234-1802", facebook: "jako.santos", address: "Brgy. Marawoy, Lipa City", birthday: "2007-08-30", allergies: "", father: "Rey Santos / 0917-100-2303", mother: "Mela Santos / 0917-100-2304", heard: "Patricia invited me", joined: "2026-04-13 10:01" },
  { id: "c03", lastName: "Cruz",      firstName: "Bianca",        gender: "F", age: 17, school: "De La Salle Lipa",     inviter: "Patricia Anne Reyes", contact: "0917-234-1803", facebook: "bianca.cruz", address: "Brgy. Bulacnin, Lipa City", birthday: "2008-05-19", allergies: "", father: "Allan Cruz / 0917-100-2305", mother: "Karen Cruz / 0917-100-2306", heard: "Through school", joined: "2026-04-13 11:33" },
  { id: "c04", lastName: "Domingo",   firstName: "Rafael",        gender: "M", age: 18, school: "De La Salle Lipa",     inviter: "Joaquin Santos", contact: "0917-234-1804", facebook: "raf.domingo", address: "Brgy. Sambat, Lipa City", birthday: "2007-11-04", allergies: "Shellfish", father: "Vic Domingo / 0917-100-2307", mother: "Tess Domingo / 0917-100-2308", heard: "Friend invited", joined: "2026-04-14 08:18" },
  { id: "c05", lastName: "Mercado",   firstName: "Isabel",        gender: "F", age: 17, school: "De La Salle Lipa",     inviter: "Bianca Cruz", contact: "0917-234-1805", facebook: "isa.mercado", address: "Brgy. Bolbok, Lipa City", birthday: "2008-01-22", allergies: "", father: "Greg Mercado / 0917-100-2309", mother: "Nila Mercado / 0917-100-2310", heard: "BLD friend", joined: "2026-04-14 14:55" },

  // Cluster 2 — Siblings + cousins (Aquino family)
  { id: "c06", lastName: "Aquino",    firstName: "Miguel",        gender: "M", age: 19, school: "Lyceum of the Philippines",  inviter: "Sister", contact: "0917-234-1806", facebook: "migs.aquino", address: "Brgy. Tambo, Lipa City", birthday: "2006-09-14", allergies: "", father: "Edgar Aquino / 0917-100-2311", mother: "Rosa Aquino / 0917-100-2312", heard: "My sister", joined: "2026-04-15 17:02" },
  { id: "c07", lastName: "Aquino",    firstName: "Sophia",        gender: "F", age: 17, school: "St. Bridget College",  inviter: "Miguel Aquino", contact: "0917-234-1807", facebook: "soph.aquino", address: "Brgy. Tambo, Lipa City", birthday: "2008-02-28", allergies: "Dairy", father: "Edgar Aquino / 0917-100-2311", mother: "Rosa Aquino / 0917-100-2312", heard: "Kuya Miguel", joined: "2026-04-15 17:10" },
  { id: "c08", lastName: "Aquino",    firstName: "Daniel",        gender: "M", age: 16, school: "St. Bridget College",  inviter: "Sophia Aquino", contact: "0917-234-1808", facebook: "dan.aquino", address: "Brgy. San Sebastian, Lipa", birthday: "2009-07-08", allergies: "", father: "Romeo Aquino / 0917-100-2313", mother: "June Aquino / 0917-100-2314", heard: "Cousin invited", joined: "2026-04-16 09:42" },

  // Cluster 3 — Church youth choir
  { id: "c09", lastName: "Tan",       firstName: "Joshua",        gender: "M", age: 18, school: "Mapua Malayan",        inviter: "Choir mate", contact: "0917-234-1809", facebook: "josh.tan", address: "Brgy. Pinagtongulan, Lipa", birthday: "2007-12-11", allergies: "", father: "Henry Tan / 0917-100-2315", mother: "Gigi Tan / 0917-100-2316", heard: "Church choir", joined: "2026-04-16 16:11" },
  { id: "c10", lastName: "Lim",       firstName: "Andrea",        gender: "F", age: 18, school: "Mapua Malayan",        inviter: "Joshua Tan", contact: "0917-234-1810", facebook: "andie.lim", address: "Brgy. Lodlod, Lipa City", birthday: "2007-06-25", allergies: "", father: "Roy Lim / 0917-100-2317", mother: "Anne Lim / 0917-100-2318", heard: "Joshua from choir", joined: "2026-04-17 08:08" },
  { id: "c11", lastName: "Ramos",     firstName: "Carla",         gender: "F", age: 19, school: "UST Manila",           inviter: "Andrea Lim", contact: "0917-234-1811", facebook: "carla.ramos", address: "Brgy. Mataas na Lupa, Lipa", birthday: "2006-04-03", allergies: "", father: "Boy Ramos / 0917-100-2319", mother: "May Ramos / 0917-100-2320", heard: "Andrea told me", joined: "2026-04-17 19:33" },

  // Cluster 4 — Workplace friends (BPO)
  { id: "c12", lastName: "Garcia",    firstName: "Marco",         gender: "M", age: 20, school: "Concentrix BPO (working)", inviter: "Officemate", contact: "0917-234-1812", facebook: "marco.g", address: "Brgy. Mabini, Lipa City", birthday: "2005-10-17", allergies: "Eggs", father: "Marco Sr. / 0917-100-2321", mother: "Diana Garcia / 0917-100-2322", heard: "Office colleague", joined: "2026-04-18 11:21" },
  { id: "c13", lastName: "Villar",    firstName: "Liza",          gender: "F", age: 21, school: "Concentrix BPO (working)", inviter: "Marco Garcia", contact: "0917-234-1813", facebook: "liza.villar", address: "Brgy. Tangob, Lipa City", birthday: "2004-08-09", allergies: "", father: "Lino Villar / 0917-100-2323", mother: "Marie Villar / 0917-100-2324", heard: "Marco from work", joined: "2026-04-18 15:42" },

  // Cluster 5 — UB Lipa group
  { id: "c14", lastName: "Pascual",   firstName: "Lance",         gender: "M", age: 17, school: "University of Batangas Lipa", inviter: "N/A", contact: "0917-234-1814", facebook: "lance.pasc", address: "Brgy. Sabang, Lipa City", birthday: "2008-12-01", allergies: "", father: "Lito Pascual / 0917-100-2325", mother: "Nita Pascual / 0917-100-2326", heard: "Saw the poster at church", joined: "2026-04-19 08:33" },
  { id: "c15", lastName: "Mendoza",   firstName: "Trisha",        gender: "F", age: 18, school: "University of Batangas Lipa", inviter: "Lance Pascual", contact: "0917-234-1815", facebook: "trish.mendoza", address: "Brgy. Bagong Pook, Lipa", birthday: "2007-05-15", allergies: "Nuts", father: "Boy Mendoza / 0917-100-2327", mother: "Ana Mendoza / 0917-100-2328", heard: "Lance invited", joined: "2026-04-19 14:02" },
  { id: "c16", lastName: "del Rosario", firstName: "Kim",         gender: "F", age: 18, school: "University of Batangas Lipa", inviter: "Trisha Mendoza", contact: "0917-234-1816", facebook: "kim.delrosario", address: "Brgy. Bolbok, Lipa City", birthday: "2007-09-21", allergies: "", father: "Ric del Rosario / 0917-100-2329", mother: "Joy del Rosario / 0917-100-2330", heard: "Trisha", joined: "2026-04-20 09:11" },

  // Singletons + small connections
  { id: "c17", lastName: "Bautista",  firstName: "Paolo",         gender: "M", age: 19, school: "Ateneo de Manila",     inviter: "N/A", contact: "0917-234-1817", facebook: "paolo.bautista", address: "Brgy. Marauoy, Lipa", birthday: "2006-11-08", allergies: "", father: "Manny Bautista / 0917-100-2331", mother: "Lorna Bautista / 0917-100-2332", heard: "Online ad", joined: "2026-04-20 12:33" },
  { id: "c18", lastName: "Navarro",   firstName: "Erika",         gender: "F", age: 17, school: "Ateneo de Manila",     inviter: "Paolo Bautista", contact: "0917-234-1818", facebook: "erika.nav", address: "Brgy. Pinagkawitan, Lipa", birthday: "2008-04-04", allergies: "", father: "Edu Navarro / 0917-100-2333", mother: "Cita Navarro / 0917-100-2334", heard: "Paolo, classmate", joined: "2026-04-20 18:22" },
  { id: "c19", lastName: "Sanchez",   firstName: "Gabriel",       gender: "M", age: 18, school: "FEU Manila",           inviter: "Pia Concepcion (BLD member)", contact: "0917-234-1819", facebook: "gab.sanchez", address: "Brgy. Antipolo, Lipa", birthday: "2007-07-19", allergies: "Pollen", father: "Caloy Sanchez / 0917-100-2335", mother: "Bea Sanchez / 0917-100-2336", heard: "Tita Pia", joined: "2026-04-21 10:45" },
  { id: "c20", lastName: "Torres",    firstName: "Janelle",       gender: "F", age: 19, school: "FEU Manila",           inviter: "Gabriel Sanchez", contact: "0917-234-1820", facebook: "janelle.t", address: "Brgy. Talisay, Lipa", birthday: "2006-08-30", allergies: "", father: "Jun Torres / 0917-100-2337", mother: "Mila Torres / 0917-100-2338", heard: "Gab told me", joined: "2026-04-21 14:18" },

  // More
  { id: "c21", lastName: "Yulo",      firstName: "Mateo",         gender: "M", age: 17, school: "Canossa Lipa",         inviter: "N/A", contact: "0917-234-1821", facebook: "mateo.yulo", address: "Brgy. Mataas na Lupa, Lipa", birthday: "2008-10-02", allergies: "", father: "Tom Yulo / 0917-100-2339", mother: "Nida Yulo / 0917-100-2340", heard: "Walk-in", joined: "2026-04-22 09:55" },
  { id: "c22", lastName: "Magsaysay", firstName: "Pia",           gender: "F", age: 17, school: "Canossa Lipa",         inviter: "Mateo Yulo", contact: "0917-234-1822", facebook: "pia.magsaysay", address: "Brgy. Tangob, Lipa City", birthday: "2008-11-27", allergies: "Seafood", father: "Ben Magsaysay / 0917-100-2341", mother: "Tess Magsaysay / 0917-100-2342", heard: "Mateo invited", joined: "2026-04-22 12:08" },
  { id: "c23", lastName: "Cabrera",   firstName: "Renz",          gender: "M", age: 16, school: "Canossa Lipa",         inviter: "Pia Magsaysay", contact: "0917-234-1823", facebook: "renz.cab", address: "Brgy. Sampaguita, Lipa", birthday: "2009-12-15", allergies: "", father: "Lito Cabrera / 0917-100-2343", mother: "Jen Cabrera / 0917-100-2344", heard: "Pia", joined: "2026-04-22 17:14" },

  { id: "c24", lastName: "Ocampo",    firstName: "Diego",         gender: "M", age: 18, school: "PUP Sta. Mesa",        inviter: "N/A", contact: "0917-234-1824", facebook: "diego.ocampo", address: "Brgy. Pinagtongulan, Lipa", birthday: "2007-02-14", allergies: "", father: "Romy Ocampo / 0917-100-2345", mother: "Sally Ocampo / 0917-100-2346", heard: "BLD Facebook page", joined: "2026-04-23 10:32" },
  { id: "c25", lastName: "Gutierrez", firstName: "Camille",       gender: "F", age: 18, school: "PUP Sta. Mesa",        inviter: "Diego Ocampo", contact: "0917-234-1825", facebook: "cams.gut", address: "Brgy. Marauoy, Lipa", birthday: "2007-04-26", allergies: "", father: "Berto Gutierrez / 0917-100-2347", mother: "Lyn Gutierrez / 0917-100-2348", heard: "Diego", joined: "2026-04-23 16:01" },

  { id: "c26", lastName: "Hernandez", firstName: "Aaron",         gender: "M", age: 17, school: "De La Salle Lipa",     inviter: "Rafael Domingo", contact: "0917-234-1826", facebook: "aaron.h", address: "Brgy. Sabang, Lipa City", birthday: "2008-06-19", allergies: "", father: "Sonny Hernandez / 0917-100-2349", mother: "Cora Hernandez / 0917-100-2350", heard: "DLSL classmate", joined: "2026-04-24 08:42" },
  { id: "c27", lastName: "Velasco",   firstName: "Mika",          gender: "F", age: 18, school: "De La Salle Lipa",     inviter: "Isabel Mercado", contact: "0917-234-1827", facebook: "mika.vel", address: "Brgy. Bulacnin, Lipa City", birthday: "2007-10-30", allergies: "", father: "Pip Velasco / 0917-100-2351", mother: "Tess Velasco / 0917-100-2352", heard: "Isabel from school", joined: "2026-04-24 11:18" },

  { id: "c28", lastName: "Robles",    firstName: "Nathan",        gender: "M", age: 19, school: "St. Bridget College",  inviter: "Sophia Aquino", contact: "0917-234-1828", facebook: "nate.robles", address: "Brgy. Lodlod, Lipa", birthday: "2006-03-08", allergies: "Gluten", father: "Tony Robles / 0917-100-2353", mother: "Gen Robles / 0917-100-2354", heard: "Sophia", joined: "2026-04-24 19:00" },
  { id: "c29", lastName: "Garcia",    firstName: "Lara",          gender: "F", age: 17, school: "St. Bridget College",  inviter: "Daniel Aquino", contact: "0917-234-1829", facebook: "lara.g", address: "Brgy. San Sebastian, Lipa", birthday: "2008-08-12", allergies: "", father: "Edwin Garcia / 0917-100-2355", mother: "Mia Garcia / 0917-100-2356", heard: "Daniel A.", joined: "2026-04-25 10:11" },

  { id: "c30", lastName: "Salazar",   firstName: "Ezekiel",       gender: "M", age: 20, school: "Working — freelance",  inviter: "N/A", contact: "0917-234-1830", facebook: "zeke.sal", address: "Brgy. Antipolo, Lipa", birthday: "2005-05-21", allergies: "", father: "Reggie Salazar / 0917-100-2357", mother: "Joy Salazar / 0917-100-2358", heard: "Posters at parish", joined: "2026-04-25 14:33" },
  { id: "c31", lastName: "Bermudez",  firstName: "Hannah",        gender: "F", age: 18, school: "Lyceum of the Philippines", inviter: "Miguel Aquino", contact: "0917-234-1831", facebook: "han.berm", address: "Brgy. Bagong Pook, Lipa", birthday: "2007-09-30", allergies: "", father: "Don Bermudez / 0917-100-2359", mother: "Eva Bermudez / 0917-100-2360", heard: "Miguel from Lyceum", joined: "2026-04-25 18:45" },
  { id: "c32", lastName: "Cortez",    firstName: "Julio",         gender: "M", age: 17, school: "Lyceum of the Philippines", inviter: "Hannah Bermudez", contact: "0917-234-1832", facebook: "julio.c", address: "Brgy. Bolbok, Lipa", birthday: "2008-11-11", allergies: "", father: "Tato Cortez / 0917-100-2361", mother: "Pinky Cortez / 0917-100-2362", heard: "Hannah", joined: "2026-04-26 08:22" },

  { id: "c33", lastName: "Punzalan",  firstName: "Audrey",        gender: "F", age: 17, school: "Canossa Lipa",         inviter: "Renz Cabrera", contact: "0917-234-1833", facebook: "audrey.p", address: "Brgy. Sampaguita, Lipa", birthday: "2008-07-04", allergies: "", father: "Bing Punzalan / 0917-100-2363", mother: "Tess Punzalan / 0917-100-2364", heard: "Renz", joined: "2026-04-26 12:09" },
  { id: "c34", lastName: "Bondoc",    firstName: "Jericho",       gender: "M", age: 18, school: "Mapua Malayan",        inviter: "Carla Ramos", contact: "0917-234-1834", facebook: "jeri.bondoc", address: "Brgy. Tangob, Lipa", birthday: "2007-01-29", allergies: "", father: "Joel Bondoc / 0917-100-2365", mother: "Lyn Bondoc / 0917-100-2366", heard: "Carla", joined: "2026-04-26 17:00" },
  { id: "c35", lastName: "Soriano",   firstName: "Patricia",      gender: "F", age: 19, school: "UST Manila",           inviter: "Carla Ramos", contact: "0917-234-1835", facebook: "trish.soriano", address: "Brgy. Marauoy, Lipa", birthday: "2006-12-17", allergies: "Peanuts", father: "Andy Soriano / 0917-100-2367", mother: "Faye Soriano / 0917-100-2368", heard: "Carla", joined: "2026-04-27 09:14" },

  { id: "c36", lastName: "de Leon",   firstName: "Anton",         gender: "M", age: 19, school: "Concentrix BPO (working)", inviter: "Liza Villar", contact: "0917-234-1836", facebook: "anton.dl", address: "Brgy. Tambo, Lipa", birthday: "2006-04-22", allergies: "", father: "Eddie de Leon / 0917-100-2369", mother: "Lina de Leon / 0917-100-2370", heard: "Liza from work", joined: "2026-04-27 13:33" },
  { id: "c37", lastName: "Manalo",    firstName: "Faith",         gender: "F", age: 20, school: "Concentrix BPO (working)", inviter: "Anton de Leon", contact: "0917-234-1837", facebook: "faith.manalo", address: "Brgy. Mataas na Lupa, Lipa", birthday: "2005-08-09", allergies: "", father: "Mon Manalo / 0917-100-2371", mother: "Ria Manalo / 0917-100-2372", heard: "Anton", joined: "2026-04-27 18:21" },

  { id: "c38", lastName: "Rivera",    firstName: "Caleb",         gender: "M", age: 16, school: "St. Bridget College",  inviter: "Lara Garcia", contact: "0917-234-1838", facebook: "caleb.r", address: "Brgy. Lodlod, Lipa", birthday: "2009-10-19", allergies: "", father: "Mar Rivera / 0917-100-2373", mother: "Glo Rivera / 0917-100-2374", heard: "Lara", joined: "2026-04-28 09:08" },
  { id: "c39", lastName: "Tolentino", firstName: "Yvonne",        gender: "F", age: 17, school: "St. Bridget College",  inviter: "Caleb Rivera", contact: "0917-234-1839", facebook: "yvonne.t", address: "Brgy. San Sebastian, Lipa", birthday: "2008-05-02", allergies: "Dairy", father: "Ed Tolentino / 0917-100-2375", mother: "Bel Tolentino / 0917-100-2376", heard: "Caleb", joined: "2026-04-28 14:27" },

  { id: "c40", lastName: "Castro",    firstName: "Benjamin",      gender: "M", age: 18, school: "UB Lipa",              inviter: "Kim del Rosario", contact: "0917-234-1840", facebook: "ben.castro", address: "Brgy. Bagong Pook, Lipa", birthday: "2007-09-08", allergies: "", father: "Ric Castro / 0917-100-2377", mother: "Lia Castro / 0917-100-2378", heard: "Kim", joined: "2026-04-28 19:00" },
  { id: "c41", lastName: "Flores",    firstName: "Rosalie",       gender: "F", age: 18, school: "UB Lipa",              inviter: "Benjamin Castro", contact: "0917-234-1841", facebook: "rosie.f", address: "Brgy. Sabang, Lipa", birthday: "2007-03-15", allergies: "", father: "Andy Flores / 0917-100-2379", mother: "Mae Flores / 0917-100-2380", heard: "Ben", joined: "2026-04-29 10:00" },

  { id: "c42", lastName: "Cuevas",    firstName: "Xander",        gender: "M", age: 19, school: "PUP Sta. Mesa",        inviter: "Camille Gutierrez", contact: "0917-234-1842", facebook: "xander.c", address: "Brgy. Antipolo, Lipa", birthday: "2006-07-11", allergies: "", father: "Bob Cuevas / 0917-100-2381", mother: "Trina Cuevas / 0917-100-2382", heard: "Camille", joined: "2026-04-29 14:55" },
  { id: "c43", lastName: "Magbanua",  firstName: "Stella",        gender: "F", age: 17, school: "Ateneo de Manila",     inviter: "Erika Navarro", contact: "0917-234-1843", facebook: "stella.m", address: "Brgy. Marauoy, Lipa", birthday: "2008-02-08", allergies: "", father: "Rolly Magbanua / 0917-100-2383", mother: "Jane Magbanua / 0917-100-2384", heard: "Erika", joined: "2026-04-29 19:14" },

  { id: "c44", lastName: "Ignacio",   firstName: "Theo",          gender: "M", age: 18, school: "FEU Manila",           inviter: "Janelle Torres", contact: "0917-234-1844", facebook: "theo.ig", address: "Brgy. Talisay, Lipa", birthday: "2007-12-23", allergies: "Shellfish", father: "Carlo Ignacio / 0917-100-2385", mother: "Lilia Ignacio / 0917-100-2386", heard: "Janelle", joined: "2026-04-30 08:30" },
  { id: "c45", lastName: "Ocampo",    firstName: "Bea",           gender: "F", age: 18, school: "FEU Manila",           inviter: "N/A", contact: "0917-234-1845", facebook: "bea.ocampo", address: "Brgy. Pinagtongulan, Lipa", birthday: "2007-06-06", allergies: "", father: "Dante Ocampo / 0917-100-2387", mother: "Vivien Ocampo / 0917-100-2388", heard: "Walk-in", joined: "2026-04-30 11:11" },
  { id: "c46", lastName: "Aguilar",   firstName: "Joaquin",       gender: "M", age: 20, school: "Working — Jollibee",   inviter: "Faith Manalo", contact: "0917-234-1846", facebook: "joaqs.ag", address: "Brgy. Bolbok, Lipa", birthday: "2005-11-30", allergies: "", father: "Dado Aguilar / 0917-100-2389", mother: "Mila Aguilar / 0917-100-2390", heard: "Faith", joined: "2026-04-30 16:42" },
  { id: "c47", lastName: "Reyes",     firstName: "Dianne",        gender: "F", age: 16, school: "St. Bridget College",  inviter: "Patricia Anne Reyes", contact: "0917-234-1847", facebook: "di.reyes", address: "Brgy. Sabang, Lipa City", birthday: "2009-09-19", allergies: "", father: "Mario Reyes / 0917-100-2301", mother: "Liza Reyes / 0917-100-2302", heard: "My ate Patricia", joined: "2026-04-30 20:00" },
  { id: "c48", lastName: "Manlapaz",  firstName: "Kyle",          gender: "M", age: 17, school: "Lyceum of the Philippines", inviter: "Julio Cortez", contact: "0917-234-1848", facebook: "kyle.man", address: "Brgy. Mabini, Lipa", birthday: "2008-04-18", allergies: "", father: "Greg Manlapaz / 0917-100-2391", mother: "Beth Manlapaz / 0917-100-2392", heard: "Julio", joined: "2026-05-01 09:33" }
];

// Connections (edges) — explicit relationship graph
// Each edge: from, to, type, source, note?
window.MOCK_CONNECTIONS = [
  // DLSL barkada cluster
  { from: "c01", to: "c02", type: "classmate",  source: "auto", note: "Patricia invited Joaquin" },
  { from: "c01", to: "c03", type: "classmate",  source: "auto" },
  { from: "c01", to: "c47", type: "sibling",    source: "manual", note: "Ate–younger sister" },
  { from: "c02", to: "c04", type: "classmate",  source: "auto" },
  { from: "c03", to: "c05", type: "classmate",  source: "auto" },
  { from: "c04", to: "c26", type: "classmate",  source: "auto" },
  { from: "c05", to: "c27", type: "classmate",  source: "auto" },
  // Aquino family
  { from: "c06", to: "c07", type: "sibling",    source: "manual", note: "Siblings" },
  { from: "c07", to: "c08", type: "family",     source: "auto",   note: "Cousins" },
  { from: "c06", to: "c31", type: "classmate",  source: "auto" },
  { from: "c07", to: "c28", type: "classmate",  source: "auto" },
  { from: "c08", to: "c29", type: "classmate",  source: "auto" },
  // Choir / Mapua
  { from: "c09", to: "c10", type: "classmate",  source: "auto",   note: "Same choir + school" },
  { from: "c10", to: "c11", type: "barkada",    source: "auto" },
  { from: "c11", to: "c34", type: "barkada",    source: "auto" },
  { from: "c11", to: "c35", type: "classmate",  source: "auto" },
  // Concentrix
  { from: "c12", to: "c13", type: "churchmate", source: "auto",   note: "Office" },
  { from: "c13", to: "c36", type: "churchmate", source: "auto" },
  { from: "c36", to: "c37", type: "churchmate", source: "auto" },
  { from: "c37", to: "c46", type: "barkada",    source: "manual" },
  // UB Lipa
  { from: "c14", to: "c15", type: "classmate",  source: "auto" },
  { from: "c15", to: "c16", type: "classmate",  source: "auto" },
  { from: "c16", to: "c40", type: "classmate",  source: "auto" },
  { from: "c40", to: "c41", type: "classmate",  source: "auto" },
  // Ateneo
  { from: "c17", to: "c18", type: "classmate",  source: "auto" },
  { from: "c18", to: "c43", type: "classmate",  source: "auto" },
  // FEU
  { from: "c19", to: "c20", type: "classmate",  source: "auto" },
  { from: "c20", to: "c44", type: "classmate",  source: "auto" },
  // Canossa
  { from: "c21", to: "c22", type: "classmate",  source: "auto" },
  { from: "c22", to: "c23", type: "classmate",  source: "auto" },
  { from: "c23", to: "c33", type: "barkada",    source: "auto" },
  // PUP
  { from: "c24", to: "c25", type: "classmate",  source: "auto" },
  { from: "c25", to: "c42", type: "classmate",  source: "auto" },
  // St Bridget extension
  { from: "c29", to: "c38", type: "classmate",  source: "auto" },
  { from: "c38", to: "c39", type: "classmate",  source: "auto" },
  // Lyceum
  { from: "c31", to: "c32", type: "classmate",  source: "auto" },
  { from: "c32", to: "c48", type: "classmate",  source: "auto" }
];

window.MOCK_GROUPS = [
  { id: "g1", name: "Kordero 1", capacity: 12, members: [] },
  { id: "g2", name: "Kordero 2", capacity: 12, members: [] },
  { id: "g3", name: "Kordero 3", capacity: 12, members: [] },
  { id: "g4", name: "Kordero 4", capacity: 12, members: [] }
];

window.MOCK_ROOMS = [
  { id: "rM1", name: "Upper Room A",  floor: "2F",  gender: "M", capacity: 8,  beds: 8,  members: [] },
  { id: "rM2", name: "Upper Room B",  floor: "2F",  gender: "M", capacity: 8,  beds: 8,  members: [] },
  { id: "rM3", name: "Garden Room",   floor: "1F",  gender: "M", capacity: 6,  beds: 6,  members: [] },
  { id: "rF1", name: "Cana Room",     floor: "2F",  gender: "F", capacity: 8,  beds: 8,  members: [] },
  { id: "rF2", name: "Bethany Room",  floor: "2F",  gender: "F", capacity: 8,  beds: 8,  members: [] },
  { id: "rF3", name: "Magdalene Hall",floor: "1F",  gender: "F", capacity: 6,  beds: 6,  members: [] }
];

window.MOCK_ACTIVITY = [
  { who: "Ate Joan",   action: "imported 12 candidates from registration_batch3.xlsx",  when: "2 hours ago" },
  { who: "Kuya Mike",  action: "added a manual connection: Patricia Anne Reyes ↔ Dianne Reyes (sibling)", when: "yesterday" },
  { who: "Ate Joan",   action: "created 4 groups for YE #19 grouping workspace", when: "yesterday" },
  { who: "Kuya Mike",  action: "edited candidate Joaquin Santos (food allergy: none → none)", when: "2 days ago" },
  { who: "Admin",      action: "unlocked Group Formation for revisions", when: "3 days ago" }
];
