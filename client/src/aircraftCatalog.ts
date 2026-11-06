export type AircraftAsset={id:string;name:string;category:string;url:string;source:string;license:string};
export const AIRCRAFT_ASSETS:AircraftAsset[]=[
  {
    "id": "s7-a320",
    "name": "Airbus A320 · S7 Airlines",
    "category": "Airliner",
    "url": "/api/models/s7-a320",
    "source": "User-supplied flight-simulator repository",
    "license": "Source repository terms"
  },
  {
    "id": "darkstar",
    "name": "SR-72 Darkstar",
    "category": "Experimental jet",
    "url": "/api/models/darkstar",
    "source": "User-supplied flight-simulator repository",
    "license": "Source repository terms"
  },
  {
    "id": "b737",
    "name": "Boeing 737",
    "category": "Airliner",
    "url": "/api/models/b737",
    "source": "amvlab/aircraft-models · B737 livery GLB",
    "license": "CC BY 4.0 · attribution required"
  },
  {
    "id": "drone",
    "name": "Unmanned Aerial Vehicle",
    "category": "Drone",
    "url": "/api/models/drone",
    "source": "amvlab/aircraft-models · drone GLB",
    "license": "CC BY 4.0 · attribution required"
  },
  {
    "id": "fighter",
    "name": "Fighter Aircraft",
    "category": "Military jet",
    "url": "/api/models/fighter",
    "source": "kewonit/aeris · FlightAirMap",
    "license": "GPL-2.0"
  },
  {
    "id": "glider",
    "name": "Sailplane",
    "category": "Glider",
    "url": "/api/models/glider",
    "source": "kewonit/aeris · FlightAirMap",
    "license": "GPL-2.0"
  },
  {
    "id": "helicopter",
    "name": "Utility Helicopter",
    "category": "Helicopter",
    "url": "/api/models/helicopter",
    "source": "kewonit/aeris · FlightAirMap",
    "license": "GPL-2.0"
  },
  {
    "id": "narrowbody",
    "name": "Narrowbody Airliner",
    "category": "Airliner",
    "url": "/api/models/narrowbody",
    "source": "amvlab/aircraft-models · A320 livery GLB",
    "license": "CC BY 4.0 · attribution required"
  },
  {
    "id": "regional-jet",
    "name": "Regional Jet",
    "category": "Regional jet",
    "url": "/api/models/regional-jet",
    "source": "amvlab/aircraft-models · A350 livery GLB",
    "license": "CC BY 4.0 · attribution required"
  },
  {
    "id": "turboprop",
    "name": "Turboprop Aircraft",
    "category": "Turboprop",
    "url": "/api/models/turboprop",
    "source": "edison16a/pheonix · ATR 72 model by Oyan3D",
    "license": "CC BY 4.0 · attribution required"
  },
  {
    "id": "widebody-2eng",
    "name": "Twin-engine Widebody",
    "category": "Airliner",
    "url": "/api/models/widebody-2eng",
    "source": "amvlab/aircraft-models · B787 livery GLB",
    "license": "CC BY 4.0 · attribution required"
  },
  {
    "id": "widebody-4eng",
    "name": "Four-engine Widebody / A380",
    "category": "Airliner",
    "url": "/api/models/widebody-4eng",
    "source": "amvlab/aircraft-models · A380 livery GLB",
    "license": "CC BY 4.0 · attribution required"
  },
  {
    "id": "boeing747",
    "name": "Boeing 747",
    "category": "Airliner",
    "url": "/api/models/boeing747",
    "source": "edison16a/pheonix · original Sketchfab model by zairiq-123",
    "license": "CC-BY-4.0"
  },
  {
    "id": "atr72",
    "name": "ATR 72-600",
    "category": "Turboprop airliner",
    "url": "/api/models/atr72",
    "source": "edison16a/pheonix · original Sketchfab model by Oyan3D",
    "license": "CC-BY-4.0"
  },
  {
    "id": "boeing787",
    "name": "Boeing 787-9",
    "category": "Airliner",
    "url": "/api/models/boeing787",
    "source": "edison16a/pheonix · original Sketchfab model by Nobilis 2",
    "license": "CC-BY-4.0"
  },
  {
    "id": "bell206",
    "name": "Bell 206 JetRanger",
    "category": "Helicopter",
    "url": "/api/models/bell206",
    "source": "edison16a/pheonix · original Sketchfab model by terran4627",
    "license": "CC-BY-4.0"
  },
  {
    "id": "cessna172",
    "name": "Cessna 172",
    "category": "Light aircraft",
    "url": "/api/models/cessna172",
    "source": "edison16a/pheonix · original Sketchfab model by e737",
    "license": "CC-BY-4.0"
  },
  {
    "id": "citation",
    "name": "Cessna Citation",
    "category": "Business jet",
    "url": "/api/models/citation",
    "source": "edison16a/pheonix · original Sketchfab model by BlenderCommunityHead",
    "license": "CC-BY-4.0"
  },
  {
    "id": "mq9",
    "name": "MQ-9",
    "category": "Unmanned aircraft",
    "url": "/api/models/mq9",
    "source": "edison16a/pheonix · original Sketchfab model by IProZenoN",
    "license": "CC-BY-4.0"
  },
  {
    "id": "private-jet",
    "name": "Private Jet",
    "category": "Business jet",
    "url": "/api/models/private-jet",
    "source": "edison16a/pheonix · original Sketchfab model by Nick the Name",
    "license": "CC-BY-4.0"
  },
  {
    "id": "mig29",
    "name": "Mikoyan MiG-29 Fulcrum",
    "category": "Fighter",
    "url": "/api/models/mig29",
    "source": "lekandigital/flight-playground · FlightGear aircraft import",
    "license": "GPL (version not specified in supplied notice)"
  },
  {
    "id": "p51d",
    "name": "North American P-51D Mustang",
    "category": "Warbird",
    "url": "/api/models/p51d",
    "source": "lekandigital/flight-playground · FlightGear aircraft import",
    "license": "GPL"
  }
];
export const DEFAULT_AIRCRAFT_ID='s7-a320';
export function getAircraft(id:string){return AIRCRAFT_ASSETS.find(x=>x.id===id)||AIRCRAFT_ASSETS[0];}
