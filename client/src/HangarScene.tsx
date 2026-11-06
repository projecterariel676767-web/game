import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';

type AircraftKind='trainer'|'jet';
function makeAircraft(kind:AircraftKind){
 const group=new THREE.Group();
 const white=new THREE.MeshStandardMaterial({color:kind==='jet'?0xc8d7e8:0xe8edf0,metalness:.28,roughness:.42});
 const dark=new THREE.MeshStandardMaterial({color:0x24384b,metalness:.5,roughness:.35});
 const glass=new THREE.MeshStandardMaterial({color:0x173d58,metalness:.65,roughness:.18});
 const red=new THREE.MeshStandardMaterial({color:0xd94c43,metalness:.25,roughness:.4});
 const length=kind==='jet'?8.8:6.2;
 const body=new THREE.Mesh(new THREE.CylinderGeometry(kind==='jet'?.34:.28,kind==='jet'?.42:.3,length,24),white);
 body.rotation.z=Math.PI/2;body.position.y=1.25;body.castShadow=true;group.add(body);
 const nose=new THREE.Mesh(new THREE.ConeGeometry(kind==='jet'?.34:.28,kind==='jet'?1.7:1.05,24),white);
 nose.rotation.z=-Math.PI/2;nose.position.set(length/2+.35,1.25,0);group.add(nose);
 const wing=new THREE.Mesh(new THREE.BoxGeometry(kind==='jet'?2.1:1.65,.13,kind==='jet'?12.2:10.4),white);
 wing.position.set(-.25,1.15,0);wing.castShadow=true;group.add(wing);
 const tail=new THREE.Mesh(new THREE.BoxGeometry(1.05,.1,kind==='jet'?4.1:3.4),white);tail.position.set(-length/2+.55,1.55,0);group.add(tail);
 const fin=new THREE.Mesh(new THREE.BoxGeometry(1.35,1.25,.12),red);fin.position.set(-length/2+.45,2.05,0);group.add(fin);
 const cockpit=new THREE.Mesh(new THREE.SphereGeometry(.48,20,12),glass);cockpit.scale.set(1.45,.55,.82);cockpit.position.set(kind==='jet'?1.4:.65,1.55,0);group.add(cockpit);
 if(kind==='trainer'){const prop=new THREE.Group();const hub=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.2,16),dark);hub.rotation.x=Math.PI/2;prop.add(hub);for(let i=0;i<2;i++){const blade=new THREE.Mesh(new THREE.BoxGeometry(.13,1.25,.08),dark);blade.rotation.z=i*Math.PI;prop.add(blade);}prop.position.set(length/2+.92,1.25,0);group.add(prop);}
 if(kind==='jet')for(const z of [-1.55,1.55]){const engine=new THREE.Mesh(new THREE.CylinderGeometry(.32,.4,2.5,20),dark);engine.rotation.z=Math.PI/2;engine.position.set(-.7,.7,z);group.add(engine);}
 for(const z of [-.8,.8]){const wheel=new THREE.Mesh(new THREE.TorusGeometry(.23,.075,10,20),dark);wheel.rotation.y=Math.PI/2;wheel.position.set(-.65,.35,z);group.add(wheel);}
 return group;
}
export default function HangarScene(){
 const mount=useRef<HTMLDivElement>(null);const aircraftRef=useRef<THREE.Group|null>(null);const sceneRef=useRef<THREE.Scene|null>(null);const [kind,setKind]=useState<AircraftKind>('trainer');
 useEffect(()=>{
  if(!mount.current)return;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0x101d2a);scene.fog=new THREE.Fog(0x101d2a,24,65);sceneRef.current=scene;
  const camera=new THREE.PerspectiveCamera(42,1,.1,150);camera.position.set(12,8,14);
  const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;mount.current.appendChild(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1,0);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.48;controls.minDistance=7;controls.maxDistance=35;
  scene.add(new THREE.HemisphereLight(0xc8e5ff,0x29313a,2));
  const key=new THREE.DirectionalLight(0xffe6c4,3.2);key.position.set(5,12,7);key.castShadow=true;key.shadow.mapSize.set(2048,2048);scene.add(key);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(42,32),new THREE.MeshStandardMaterial({color:0x394650,roughness:.88}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
  const grid=new THREE.GridHelper(42,42,0x71808a,0x53616a);grid.position.y=.015;scene.add(grid);
  const wallMat=new THREE.MeshStandardMaterial({color:0x526575,metalness:.35,roughness:.65}),roofMat=new THREE.MeshStandardMaterial({color:0x263d50,metalness:.55,roughness:.5});
  const addBox=(w:number,h:number,d:number,x:number,y:number,z:number,mat:THREE.Material)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);};
  addBox(42,8,.45,0,4,-15.5,wallMat);addBox(.45,8,31,-21,4,0,wallMat);addBox(.45,8,31,21,4,0,wallMat);addBox(42,.45,32,0,8,0,roofMat);
  for(let x=-18;x<=18;x+=6)addBox(.18,7,.22,x,4,-15.15,new THREE.MeshStandardMaterial({color:0x91a6b5,metalness:.7}));
  const door=new THREE.Mesh(new THREE.PlaneGeometry(17,6.8),new THREE.MeshStandardMaterial({color:0x162c3e,roughness:.6,side:THREE.DoubleSide}));door.position.set(0,3.5,15.25);scene.add(door);
  const plane=makeAircraft('trainer');scene.add(plane);aircraftRef.current=plane;
  const resize=()=>{if(!mount.current)return;const w=mount.current.clientWidth,h=mount.current.clientHeight;camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix();renderer.setSize(w,h);};resize();const observer=new ResizeObserver(resize);observer.observe(mount.current);
  let frame=0;const animate=()=>{frame=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);};animate();
  return()=>{cancelAnimationFrame(frame);observer.disconnect();controls.dispose();renderer.dispose();scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose());}});if(mount.current?.contains(renderer.domElement))mount.current.removeChild(renderer.domElement);sceneRef.current=null;aircraftRef.current=null;};
 },[]);
 useEffect(()=>{const scene=sceneRef.current,old=aircraftRef.current;if(!scene||!old)return;scene.remove(old);const next=makeAircraft(kind);scene.add(next);aircraftRef.current=next;},[kind]);
 return <section className="hangar-scene-wrap"><div className="hangar-toolbar"><div><span className="eyebrow">3D HANGAR · INTERACTIVE VIEW</span><h3>Aircraft showroom</h3></div><div className="hangar-switch"><button className={kind==='trainer'?'selected':''} onClick={()=>setKind('trainer')}>Explorer Trainer</button><button className={kind==='jet'?'selected':''} onClick={()=>setKind('jet')}>Twin Jet</button></div></div><div className="hangar-canvas" ref={mount}><div className="hangar-hint">Drag to rotate · Scroll to zoom</div></div><div className="hangar-caption"><b>{kind==='trainer'?'Explorer Trainer':'Twin Jet'}</b><span>{kind==='trainer'?'Single-engine propeller aircraft · procedural 3D model':'Twin-engine jet aircraft · procedural 3D model'}</span></div></section>;
}
