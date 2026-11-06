import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { resolve } from 'node:path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { z } from 'zod';
import multer from 'multer';
import { User, Preferences, Message, Device } from './models.js';

const app=express(); const server=http.createServer(app);
const origins=(process.env.CLIENT_ORIGIN||'*').split(',').map(x=>x.trim());
app.use(cors({origin:origins.includes('*')?'*':origins,credentials:!origins.includes('*')}));
app.use(express.json({limit:'2mb'}));
const io=new Server(server,{path:'/socket.io/',transports:['polling','websocket'],allowUpgrades:true,pingInterval:25000,pingTimeout:20000,cors:{origin:origins.includes('*')?'*':origins,methods:['GET','POST']}});io.engine.on('connection_error',(err:any)=>console.warn('[socket.io] engine connection error',{code:err.code,message:err.message,context:err.context}));
const secret=process.env.JWT_SECRET||'development-only-change-this-secret';
const auth=async(req:any,res:any,next:any)=>{try{const h=req.headers.authorization||'';const token=h.startsWith('Bearer ')?h.slice(7):'';const p:any=jwt.verify(token,secret);req.userId=p.sub;next();}catch{return res.status(401).json({error:'Unauthorized'});}};
const healthHandler=(_req:any,res:any)=>res.json({ok:true,service:'pin-world-api',database:mongoose.connection.readyState===1?'connected':'disconnected'});
app.get('/health',healthHandler);
app.get('/api/health',healthHandler);
const registerSchema=z.object({nickname:z.string().trim().min(2).max(24),email:z.string().email().max(254),password:z.string().min(8).max(128),avatarUrl:z.string().url().optional()});
app.post('/api/auth/register',async(req,res)=>{const parsed=registerSchema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'Invalid registration details'});try{const {nickname,email,password,avatarUrl}=parsed.data;const passwordHash=await bcrypt.hash(password,12);const user=await User.create({nickname,email,passwordHash,avatarUrl});await Preferences.create({userId:user._id});const token=jwt.sign({sub:user.id},secret,{expiresIn:'30d'});res.status(201).json({token,user:{id:user.id,nickname:user.nickname,email:user.email,avatarUrl:user.avatarUrl}});}catch(e:any){res.status(e.code===11000?409:500).json({error:e.code===11000?'Nickname or email already exists':'Registration failed'});}});
app.post('/api/auth/login',async(req,res)=>{const {email,password}=req.body||{};if(typeof email!=='string'||typeof password!=='string')return res.status(400).json({error:'Email and password required'});const user=await User.findOne({email:email.toLowerCase()});if(!user||!await bcrypt.compare(password,user.passwordHash))return res.status(401).json({error:'Invalid email or password'});const token=jwt.sign({sub:user.id},secret,{expiresIn:'30d'});res.json({token,user:{id:user.id,nickname:user.nickname,email:user.email,avatarUrl:user.avatarUrl}});});
app.get('/api/auth/me',auth,async(req:any,res)=>{const u=await User.findById(req.userId).select('-passwordHash');if(!u)return res.status(404).json({error:'User not found'});res.json({user:u});});
app.get('/api/preferences',auth,async(req:any,res)=>{const p=await Preferences.findOne({userId:req.userId});res.json({preferences:p});});
app.put('/api/preferences',auth,async(req:any,res)=>{const update:any={updatedAt:new Date()};for(const key of ['earth','aircraft','device'])if(req.body?.[key]!==undefined)update[key]=req.body[key];if(update.earth?.opacity!==undefined)update.earth.opacity=Math.max(0,Math.min(1,Number(update.earth.opacity)));const p=await Preferences.findOneAndUpdate({userId:req.userId},{$set:update},{new:true,upsert:true});res.json({preferences:p});});
app.get('/api/messages',auth,async(req:any,res)=>{const messages=await Message.find({userId:req.userId}).sort({createdAt:1}).limit(200);res.json({messages});});
app.post('/api/messages',auth,async(req:any,res)=>{const content=String(req.body?.content||'').trim();if(!content||content.length>12000)return res.status(400).json({error:'Message must contain 1–12000 characters'});const message=await Message.create({userId:req.userId,role:'user',content});res.status(201).json({message});});
const audioUpload=multer({storage:multer.memoryStorage(),limits:{fileSize:20*1024*1024,files:1}});
async function groqReply(userId:string,content:string){
 const key=process.env.GROQ_API_KEY;if(!key)throw Object.assign(new Error('Groq is not configured. Add GROQ_API_KEY in Render environment variables.'),{status:503});
 const history=await Message.find({userId}).sort({createdAt:-1}).limit(12).lean();
 const conversation=history.reverse().map((m:any)=>({role:m.role==='assistant'?'assistant':'user',content:m.content}));
 const response=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.GROQ_CHAT_MODEL||'llama-3.3-70b-versatile',messages:[{role:'system',content:'You are Pin World AI, a helpful assistant for geography, Earth observation, aviation, travel and general questions. Answer clearly in the language used by the user.'},...conversation],temperature:0.6,max_tokens:1200}),signal:AbortSignal.timeout(45000)});
 const data:any=await response.json().catch(()=>({}));if(!response.ok)throw Object.assign(new Error(data.error?.message||'Groq chat request failed'),{status:502});
 return String(data.choices?.[0]?.message?.content||'I could not generate a response.');
}
app.post('/api/ai/chat',auth,async(req:any,res:any)=>{
 const content=String(req.body?.content||'').trim();if(!content||content.length>12000)return res.status(400).json({error:'Message must contain 1–12000 characters'});
 try{await Message.create({userId:req.userId,role:'user',content});const reply=await groqReply(req.userId,content);const answer=await Message.create({userId:req.userId,role:'assistant',content:reply});res.json({reply:answer});}
 catch(e:any){res.status(e.status||502).json({error:e.message||'AI request failed'});}
});
app.post('/api/ai/voice',auth,audioUpload.single('audio'),async(req:any,res:any)=>{
 if(!req.file)return res.status(400).json({error:'Audio file is required'});
 const key=process.env.GROQ_API_KEY;if(!key)return res.status(503).json({error:'Groq is not configured. Add GROQ_API_KEY in Render environment variables.'});
 try{
  const form=new FormData();form.append('file',new Blob([req.file.buffer],{type:req.file.mimetype||'audio/webm'}),req.file.originalname||'voice.webm');form.append('model',process.env.GROQ_TRANSCRIPTION_MODEL||'whisper-large-v3-turbo');form.append('response_format','json');
  const transcribed=await fetch('https://api.groq.com/openai/v1/audio/transcriptions',{method:'POST',headers:{Authorization:'Bearer '+key},body:form,signal:AbortSignal.timeout(60000)});
  const transcriptData:any=await transcribed.json().catch(()=>({}));if(!transcribed.ok)throw Object.assign(new Error(transcriptData.error?.message||'Speech recognition failed'),{status:502});
  const transcript=String(transcriptData.text||'').trim();if(!transcript)return res.status(422).json({error:'No speech was recognized. Please try again.'});
  await Message.create({userId:req.userId,role:'user',content:transcript});
  const reply=await groqReply(req.userId,transcript);
  const answer=await Message.create({userId:req.userId,role:'assistant',content:reply});
  res.json({transcript,reply:answer});
 }catch(e:any){console.error('[groq-voice]',e.message||e);res.status(e.status||502).json({error:e.message||'Voice processing failed'});}
});
app.post('/api/devices',auth,async(req:any,res)=>{const device=await Device.create({userId:req.userId,deviceType:String(req.body?.deviceType||'unknown').slice(0,40),name:String(req.body?.name||'My device').slice(0,80),metadata:req.body?.metadata||{}});res.status(201).json({device});});

const aircraftModelSources:Record<string,string>={
 's7-a320':'https://raw.githubusercontent.com/wprojecter-cmd/flight-simulator/main/airbus_a320_s7_airlines.glb',
 darkstar:'https://raw.githubusercontent.com/wprojecter-cmd/flight-simulator/main/static/models/lockheed_martin_sr72_darkstar__topgun_maverick.glb',
 b737:'https://raw.githubusercontent.com/amvlab/aircraft-models/main/models/B737.glb',
 drone:'https://raw.githubusercontent.com/amvlab/aircraft-models/main/models/drone.glb',
 fighter:'https://raw.githubusercontent.com/kewonit/aeris/main/public/models/aircraft/fighter.glb',
 glider:'https://raw.githubusercontent.com/kewonit/aeris/main/public/models/aircraft/glider.glb',
 helicopter:'https://raw.githubusercontent.com/kewonit/aeris/main/public/models/aircraft/helicopter.glb',
 narrowbody:'https://raw.githubusercontent.com/amvlab/aircraft-models/main/models/A320.glb',
 'regional-jet':'https://raw.githubusercontent.com/amvlab/aircraft-models/main/models/A350.glb',
 turboprop:'https://raw.githubusercontent.com/edison16a/pheonix/main/public/models/atr72.glb',
 'widebody-2eng':'https://raw.githubusercontent.com/amvlab/aircraft-models/main/models/B787.glb',
 'widebody-4eng':'https://raw.githubusercontent.com/amvlab/aircraft-models/main/models/A380.glb',
 boeing747:'https://raw.githubusercontent.com/edison16a/pheonix/main/public/models/airplane.glb',
 atr72:'https://raw.githubusercontent.com/edison16a/pheonix/main/public/models/atr72.glb',
 boeing787:'https://raw.githubusercontent.com/edison16a/pheonix/main/public/models/b789.glb',
 bell206:'https://raw.githubusercontent.com/edison16a/pheonix/main/public/models/bell206.glb',
 cessna172:'https://raw.githubusercontent.com/edison16a/pheonix/main/public/models/c172.glb',
 citation:'https://raw.githubusercontent.com/edison16a/pheonix/main/public/models/citation2.glb',
 mq9:'https://raw.githubusercontent.com/edison16a/pheonix/main/public/models/mq9.glb',
 'private-jet':'https://raw.githubusercontent.com/edison16a/pheonix/main/public/models/jet.glb',
 mig29:'https://raw.githubusercontent.com/lekandigital/flight-playground/main/dist/flightgear/mig29/model.glb',
 p51d:'https://raw.githubusercontent.com/lekandigital/flight-playground/main/dist/flightgear/p51d/model.glb'
};
app.get('/api/models/:id',async(req,res)=>{
 const source=aircraftModelSources[req.params.id];
 if(!source)return res.status(404).json({error:'Unknown aircraft model'});
 try{
  const upstream=await fetch(source,{headers:{'User-Agent':'PinWorld-Model-Proxy/1.0'},signal:AbortSignal.timeout(30000)});
  if(!upstream.ok){console.warn('[aircraft-model] upstream failed',{id:req.params.id,status:upstream.status,source});return res.status(502).json({error:'Aircraft model source unavailable',upstreamStatus:upstream.status});}
  const bytes=Buffer.from(await upstream.arrayBuffer());
  if(bytes.length<20||bytes.toString('ascii',0,4)!=='glTF'){console.warn('[aircraft-model] invalid GLB payload',{id:req.params.id,bytes:bytes.length});return res.status(502).json({error:'Source did not return a valid GLB'});}
  res.setHeader('Content-Type','model/gltf-binary');res.setHeader('Content-Length',String(bytes.length));res.setHeader('Cache-Control','public, max-age=86400, stale-while-revalidate=604800');res.send(bytes);
 }catch(error:any){console.warn('[aircraft-model] proxy request failed',{id:req.params.id,error:error?.message||String(error)});res.status(502).json({error:'Could not retrieve aircraft model'});}
});


app.get('/api/models/:id/*',async(req,res)=>{
 const source=aircraftModelSources[req.params.id],wildcard=(req.params as Record<string,string| string[]>)[0],relative=Array.isArray(wildcard)?wildcard.join('/'):String(wildcard||'');
 if(!source||!relative||relative.split('/').some((part:string)=>!part||part==='.'||part==='..'))return res.status(404).end();
 try{
  const base=new URL(source),asset=new URL(relative,source);
  if(asset.origin!==base.origin||!asset.pathname.startsWith(base.pathname.slice(0,base.pathname.lastIndexOf('/')+1)))return res.status(400).end();
  const upstream=await fetch(asset,{headers:{'User-Agent':'PinWorld-Model-Proxy/1.0'},signal:AbortSignal.timeout(20000)});
  if(!upstream.ok){console.warn('[aircraft-model-asset] upstream failed',{id:req.params.id,path:relative,status:upstream.status});return res.status(502).end();}
  const bytes=Buffer.from(await upstream.arrayBuffer());
  const ext=relative.toLowerCase().split('.').pop();
  const types:Record<string,string>={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',ktx2:'image/ktx2',bin:'application/octet-stream'};
  res.setHeader('Content-Type',upstream.headers.get('content-type')||types[ext||'']||'application/octet-stream');
  res.setHeader('Cache-Control','public, max-age=86400, stale-while-revalidate=604800');
  res.send(bytes);
 }catch(error:any){console.warn('[aircraft-model-asset] proxy failed',{id:req.params.id,path:relative,error:error?.message||String(error)});res.status(502).end();}
});

app.get('/api/config',(_req,res)=>res.json({cesiumIonToken:process.env.CESIUM_ION_TOKEN||null,weatherConfigured:!!process.env.OPENWEATHER_API_KEY,aiConfigured:!!process.env.GROQ_API_KEY}));
const weatherLayers=new Set(['temp_new','precipitation_new','wind_new','pressure_new','clouds_new']);
app.get('/api/weather/tiles/:layer/:z/:x/:y.png',async(req,res)=>{const key=process.env.OPENWEATHER_API_KEY;const {layer,z,x,y}=req.params;if(!key)return res.status(503).setHeader('X-Weather-Error','OPENWEATHER_API_KEY is not configured').end();if(!weatherLayers.has(layer)||![z,x,y].every(v=>/^\d+$/.test(v)))return res.status(400).end();try{const upstream=await fetch('https://tile.openweathermap.org/map/'+layer+'/'+z+'/'+x+'/'+y+'.png?appid='+encodeURIComponent(key),{signal:AbortSignal.timeout(12000)});if(!upstream.ok){const detail=(await upstream.text()).slice(0,240).replace(/[\\r\\n]+/g,' ');console.warn('[weather-tile] upstream rejected request',{layer,z,x,y,status:upstream.status,detail});return res.status(502).setHeader('X-Weather-Upstream-Status',String(upstream.status)).end();}const bytes=Buffer.from(await upstream.arrayBuffer());if(bytes.length<8||bytes[0]!==137||bytes[1]!==80||bytes[2]!==78||bytes[3]!==71){console.warn('[weather-tile] upstream response was not a PNG',{layer,z,x,y,bytes:bytes.length});return res.status(502).end();}res.setHeader('Content-Type','image/png');res.setHeader('Cache-Control','public, max-age=300');res.send(bytes);}catch(error:any){console.warn('[weather-tile] upstream request failed',{layer,z,x,y,error:error?.message||String(error)});return res.status(502).end();}});
io.use((socket:any,next)=>{try{const token=socket.handshake.auth?.token;if(!token)throw new Error('missing token');const p:any=jwt.verify(token,secret);socket.data.userId=p.sub;next();}catch(error:any){console.warn('[socket.io] rejected socket authentication:',error?.message||'unknown error');next(new Error('Unauthorized'));}});
io.on('connection',(socket:any)=>{socket.join('world');socket.on('player:update',(state:any)=>{if(state&&typeof state==='object')socket.to('world').emit('player:update',{userId:socket.data.userId,state});});socket.on('voice:join',(room:string)=>{if(typeof room==='string'&&room.length<80)socket.join('voice:'+room);});socket.on('voice:signal',(payload:any)=>{if(payload?.to&&payload?.signal)io.to(String(payload.to)).emit('voice:signal',{from:socket.id,signal:payload.signal});});});
// The same Render service hosts the built browser app and its API.
const webRoot=resolve(process.cwd(),'client/dist');
app.use(express.static(webRoot));
app.get('*',(req,res,next)=>{if(req.path.startsWith('/api/')||req.path.startsWith('/socket.io/'))return next();res.sendFile(resolve(webRoot,'index.html'));});
const port=Number(process.env.PORT||10000);
if(process.env.MONGODB_URI){mongoose.connect(process.env.MONGODB_URI).then(()=>console.log('MongoDB connected')).catch(e=>console.error('MongoDB connection failed',e));}
server.listen(port,'0.0.0.0',()=>console.log('Pin World API listening on '+port));