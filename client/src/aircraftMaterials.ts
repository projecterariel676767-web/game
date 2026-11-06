import * as THREE from 'three';

const finishes:Record<string,{body:number;accent:number;metal:number}> = {
 b737:{body:0xe7edf3,accent:0x174a78,metal:0x778b9b},
 drone:{body:0x8d9aa4,accent:0x273746,metal:0x596b78},
 fighter:{body:0x667783,accent:0x263d50,metal:0x9aa8b0},
 glider:{body:0xe9f1f6,accent:0x1b88b5,metal:0x9baab4},
 helicopter:{body:0xd8e1e4,accent:0xd46b25,metal:0x667986},
 narrowbody:{body:0xe9edf2,accent:0x176b9a,metal:0x8798a5},
 'regional-jet':{body:0xe7edf2,accent:0x3d628d,metal:0x8999a5},
 turboprop:{body:0xe6e9e2,accent:0x2f755f,metal:0x82918c},
 'widebody-2eng':{body:0xeaf0f4,accent:0x215e83,metal:0x8194a2},
 'widebody-4eng':{body:0xeaf0f4,accent:0x1f5b87,metal:0x8194a2},
 boeing747:{body:0xe9eef2,accent:0x174d83,metal:0x8799a5},
 atr72:{body:0xe9eee9,accent:0x39785b,metal:0x7c8d87},
 boeing787:{body:0xe8edf3,accent:0x235c8c,metal:0x7f93a4},
 bell206:{body:0xe0e6e8,accent:0xd56b2b,metal:0x74848d},
 cessna172:{body:0xe7e9dc,accent:0x286f9b,metal:0x8b9899},
 citation:{body:0xe9edf1,accent:0x38658b,metal:0x8796a1},
 mq9:{body:0x788894,accent:0x34485b,metal:0x9ba8ae},
 'private-jet':{body:0xe8edf2,accent:0x344c72,metal:0x8795a3},
 mig29:{body:0x73808a,accent:0x3f586b,metal:0xb0b9bd},
 p51d:{body:0x9b8a63,accent:0x3b4f61,metal:0xadb6b6}
};
export function applyAircraftFinish(root:THREE.Object3D,id:string){
 const finish=finishes[id]||{body:0xdce5eb,accent:0x346b91,metal:0x8799a5};
 root.traverse(object=>{
  if(!(object instanceof THREE.Mesh))return;
  const meshName=object.name.toLowerCase();
  const accentPart=/wingtip|stripe|marking|logo|tail.?accent|accent|trim/.test(meshName);
  const glassPart=/glass|window|canopy|cockpit/.test(meshName);
  const rubberPart=/tire|tyre|wheel|rubber/.test(meshName);
  const source=Array.isArray(object.material)?object.material:[object.material];
  const mapped=source.map(original=>{
   const material=original.clone() as THREE.MeshStandardMaterial;
   if('color' in material && !(material as any).map){
    const target=glassPart?0x263b4b:rubberPart?0x20262b:accentPart?finish.accent:finish.body;
    (material as any).color.setHex(target);
    if(material instanceof THREE.MeshStandardMaterial){
     material.metalness=glassPart?.35:rubberPart?.05:.22;
     material.roughness=glassPart?.22:rubberPart?.82:.48;
     if(glassPart){material.transparent=true;material.opacity=.88;}
    }
   }else if(material instanceof THREE.MeshStandardMaterial){
    material.envMapIntensity=1.15;
   }
   return material;
  });
  object.material=Array.isArray(object.material)?mapped:mapped[0];
  object.castShadow=true;object.receiveShadow=true;
 });
}
