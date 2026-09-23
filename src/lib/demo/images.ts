// Image URLs for demo data. All images are shown via <Photo>, which falls back to
// a calm gradient + emoji if an image can't be loaded. In production the clinic
// uploads its own photos (Supabase Storage).
export const img = (id: string, w = 900) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;

export const IMAGES = {
  massage: img("photo-1544161515-4ab6ce6db874", 1600),
  massageStones: img("photo-1600334089648-b0d9d3028eb2", 1600),
  spaCalm: img("photo-1519823551278-64ac92734fb1", 1600),
  hairSalon: img("photo-1560066984-138dadb4c035", 1600),
  hairCut: img("photo-1521590832167-7bcbfaa6381f", 1600),
  chiro: img("photo-1552693673-1bf958298935", 1600),
  physio: img("photo-1576091160550-2173dba999ef", 1600),
  dental: img("photo-1629909613654-28e377c37b09", 1600),
  dentalChair: img("photo-1606811841689-23dfddce3e95", 1600),
  skin: img("photo-1570172619644-dfd03ed5d881", 1600),
  feet: img("photo-1519415510236-718bdfcd89c8", 1600),
  clinicInterior: img("photo-1519494026892-80bbd2d6fd0d", 1600),
  reception: img("photo-1556740738-b6a63e27c4df", 1400),
  website: img("photo-1460925895917-afdab827c52f", 1400),
};
