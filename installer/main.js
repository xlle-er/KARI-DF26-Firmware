import {ESPLoader,Transport} from 'esptool-js';
import boards from './boards.json';
import {pinNames,validateProfile,loadRelease,performFlash,verifyState} from './protocol.js';
import {request,waitForDevice} from './serial.js';
import {firstUseRequest} from './first-use.js';
const $=id=>document.getElementById(id);
let port=null,existing=null,busy=false,lang='zh',releaseVersion=null;
const supported=window.isSecureContext&&Boolean(navigator.serial);
const recommended=()=>$('recommended').value==='yes';
const log=value=>{$('status').textContent=value;};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
for(const name of pinNames){const row=document.createElement('div');row.className='pin-row';const input=document.createElement('input');input.id='pin-'+name;input.type='number';input.step='1';input.min='0';input.max='48';input.setAttribute('aria-label',name.toUpperCase()+' GPIO');input.oninput=()=>{$('pinsConfirmed').checked=false;};const wire=document.createElement('span');wire.className='wire';wire.setAttribute('aria-hidden','true');const label=document.createElement('label');label.htmlFor=input.id;label.textContent=name.toUpperCase();row.append(input,wire,label);$('pins').append(row);}
function renderPins(){const spec=boards[$('board').value];const values=$('wiring').value==='preserve'?existing?.hardware_profile?.pins:spec.default_pins;for(const name of pinNames){$('pin-'+name).value=values?.[name]??'';$('pin-'+name).disabled=$('wiring').value!=='custom';}$('pinsConfirmed').checked=false;}
function profile(){if($('wiring').value==='preserve'){if(!existing?.hardware_configured)throw Error('No existing wiring');return validateProfile(existing.hardware_profile,boards);}const pins={};for(const k of pinNames){if($('pin-'+k).value.trim()==='')throw Error('All six GPIO values required / 请填写全部 GPIO');pins[k]=Number($('pin-'+k).value);}return validateProfile({version:1,board:$('board').value,pins},boards);}
function renderRoute(){
 const answered=Boolean($('recommended').value),quick=recommended();
 for(const id of ['deviceStep','wiringStep','installStep'])$(id).hidden=!answered;
 $('recommendedGuide').hidden=!quick;$('boardDetails').hidden=quick;
 $('wiringStep').hidden=!answered||(quick&&!existing?.hardware_configured);
 $('pinDetails').hidden=quick;$('wiringChoice').hidden=quick&&!existing?.hardware_configured;
 $('existingGuide').hidden=!existing?.hardware_configured;
 $('installTitle').textContent=`${quick&&!existing?.hardware_configured?2:3}. ${lang==='zh'?'安装并验证':'Install & verify'}`;
 $('wiring').querySelector('[value=custom]').hidden=quick;
 if(quick){$('moduleConfirmed').checked=true;$('pinsConfirmed').checked=true;}
}
function updateControls(){
 $('connect').disabled=busy||!supported;
 $('configure').disabled=busy||!supported||!port;
 $('install').disabled=busy||!supported||!port;
 for(const id of ['board','wiring','recommended','moduleConfirmed','pinsConfirmed','deviceName'])$(id).disabled=busy;
 for(const name of pinNames)$('pin-'+name).disabled=busy||$('wiring').value!=='custom';
}
$('recommended').onchange=()=>{
 existing=null;port=null;releaseVersion=null;$('device').textContent='—';
 $('wiring').querySelector('[value=preserve]').disabled=true;$('wiring').value='default';
 if(recommended())$('board').value='n16r8';
 $('moduleConfirmed').checked=false;renderPins();renderRoute();updateControls();
};
$('wiring').onchange=()=>{renderPins();renderRoute();};$('board').onchange=()=>{port=null;$('device').textContent='—';existing=null;releaseVersion=null;$('wiring').value='default';$('wiring').querySelector('[value=preserve]').disabled=true;renderPins();$('moduleConfirmed').checked=false;renderRoute();updateControls();};
$('language').onclick=()=>{lang=lang==='zh'?'en':'zh';document.documentElement.lang=lang==='zh'?'zh-CN':'en';for(const e of document.querySelectorAll('[data-zh]'))e.textContent=e.dataset[lang];$('language').textContent=lang==='zh'?'English':'中文';renderRoute();};
function check(){if(!$('moduleConfirmed').checked)throw Error('Confirm module/pinout and disconnect motor power / 请确认板型并断开电机电源');if(!port)throw Error('Select a USB device first / 请先选择 USB 设备');}
function readyProfile(){const name=$('deviceName').value;if(name&&(!name.trim()||new TextEncoder().encode(name).length>24||/[\x00-\x1f\x7f-\x9f]/u.test(name)))throw Error('Name must fit 24 UTF-8 bytes / 名字最多 24 个 UTF-8 字节');check();if(!$('pinsConfirmed').checked)throw Error('Confirm actual wiring / 请确认实际接线');return profile();}
async function withLoader(fn){const transport=new Transport(port,false);const loader=new ESPLoader({transport,baudrate:460800,terminal:{clean(){},write:log,writeLine:log}});try{await loader.main();return await fn(loader);}finally{try{await loader.after('hard_reset');}catch{}await transport.disconnect().catch(()=>{});await pause(700);}}
async function action(button,fn){if(busy||!supported)return;busy=true;$('next').hidden=true;updateControls();try{await fn();}catch(e){if(button==='connect'){port=null;existing=null;$('wiring').value='default';$('wiring').querySelector('[value=preserve]').disabled=true;renderPins();renderRoute();}log(e.message);}finally{busy=false;updateControls();}}
$('connect').onclick=()=>action('connect',async()=>{if(!$('moduleConfirmed').checked)throw Error('Confirm the module and disconnect motor power first / 请先确认板型并断开电机电源');const selectedPort=await navigator.serial.requestPort();port=null;existing=null;releaseVersion=null;$('wiring').value='default';$('wiring').querySelector('[value=preserve]').disabled=true;renderPins();renderRoute();log('Reading device / 正在读取设备…');try{existing=await request(selectedPort,{type:'hardware_get'},2000);releaseVersion=existing.firmware_version;}catch{}const spec=boards[$('board').value];if(existing?.hardware_configured&&existing.hardware_profile?.board!==spec.board)throw Error('Existing board differs. Confirm board before continuing / 已有板型与所选板型不同，请重新确认');port=selectedPort;try{await withLoader(async loader=>{if(loader.chip.CHIP_NAME!=='ESP32-S3'||await loader.getFlashSize()!==spec.flash_mb*1024)throw Error('Chip/Flash mismatch / 芯片或 Flash 容量不符');$('device').textContent=`ESP32-S3 · ${spec.flash_mb} MB Flash · ${existing?.device_id||'USB'}`;});}catch(e){port=null;throw e;}if(existing?.hardware_configured&&existing.hardware_profile.board===spec.board){validateProfile(existing.hardware_profile,boards);$('wiring').querySelector('[value=preserve]').disabled=false;$('wiring').value='preserve';renderPins();}renderRoute();log(recommended()?'Device checked. Ready to install latest firmware / 检查通过，可以安装最新固件。':'Device checked. Confirm wiring before installation / 检查通过，请核对接线后安装。');});
async function configureAndVerify(p,version){await firstUseRequest(request,port,{type:'hardware_set',hardware_profile:p});await pause(2200);let state=verifyState(await waitForDevice(port),boards[p.board],p,version);const name=$('deviceName').value;if(name){if(!name.trim()||new TextEncoder().encode(name).length>24||/[\x00-\x1f\x7f-\x9f]/u.test(name))throw Error('Name must fit 24 UTF-8 bytes / 名字最多 24 个 UTF-8 字节');await firstUseRequest(request,port,{type:'device_name_set',name});await pause(2200);state=verifyState(await waitForDevice(port),boards[p.board],p,version);if(state.name!=='KARI-'+name||state.ap_ssid!=='KARI-'+name||!state.device_name_custom)throw Error('Name readback mismatch / 名称回读不匹配');}existing=state;$('wiring').querySelector('[value=preserve]').disabled=false;$('wiring').value='preserve';renderPins();renderRoute();$('next').hidden=false;$('progress').value=100;log(`Verified / 已验证: ${state.device_id} · ${state.firmware_version}`);}
$('install').onclick=()=>action('install',async()=>{const p=readyProfile();log('Downloading verified release / 正在下载并校验官方安装包…');const spec=boards[p.board],release=await loadRelease(spec);releaseVersion=release.manifest.version;await withLoader(loader=>performFlash(loader,spec,release,(i,written,total)=>{$('progress').value=Math.round((i+written/total)/4*85);log('Writing and verifying USB firmware / 正在写入并校验固件…');}));const state=await waitForDevice(port);if(state.firmware_version!==releaseVersion)throw Error('Installed version mismatch / 安装版本不匹配');await configureAndVerify(p,releaseVersion);});
$('configure').onclick=()=>action('configure',async()=>{if(!port){if(!$('moduleConfirmed').checked)throw Error('Confirm module first / 请先确认板型');port=await navigator.serial.requestPort();}const p=readyProfile();const state=await request(port,{type:'hardware_get'});releaseVersion=state.firmware_version;await configureAndVerify(p,releaseVersion);});
if(!supported){$('support').textContent='请使用电脑 Chrome / Edge，通过 HTTPS 或 localhost 打开。Use desktop Chrome / Edge over HTTPS or localhost.';for(const id of ['connect','install','configure'])$(id).disabled=true;}
renderPins();renderRoute();updateControls();
