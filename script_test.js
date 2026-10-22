

// ========== DEEP SEA SOUND & EFFECTS ==========
let soundEnabled = true;
let audioCtx = null;
function initAudio(){if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();}
function toggleSound(){
  soundEnabled=!soundEnabled;
  document.getElementById('soundToggle').textContent=soundEnabled?'🔊 الصوت: مفعل':'🔇 الصوت: معطل';
}
function playSonar(){
  if(!soundEnabled)return;initAudio();if(audioCtx.state==='suspended')audioCtx.resume();
  const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
  osc.type='sine';osc.frequency.setValueAtTime(800,audioCtx.currentTime);osc.frequency.exponentialRampToValueAtTime(300,audioCtx.currentTime+0.4);
  gain.gain.setValueAtTime(0.1,audioCtx.currentTime);gain.gain.exponentialRampToValueAtTime(0.01,audioCtx.currentTime+0.4);
  osc.connect(gain);gain.connect(audioCtx.destination);osc.start();osc.stop(audioCtx.currentTime+0.4);
}
function playCapture(){
  if(!soundEnabled)return;initAudio();if(audioCtx.state==='suspended')audioCtx.resume();
  const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
  osc.type='sawtooth';osc.frequency.setValueAtTime(150,audioCtx.currentTime);osc.frequency.exponentialRampToValueAtTime(40,audioCtx.currentTime+0.5);
  gain.gain.setValueAtTime(0.3,audioCtx.currentTime);gain.gain.exponentialRampToValueAtTime(0.01,audioCtx.currentTime+0.5);
  const filter=audioCtx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=300;
  osc.connect(filter);filter.connect(gain);gain.connect(audioCtx.destination);osc.start();osc.stop(audioCtx.currentTime+0.5);
}
function createShockwave(r,c){
  const br=flipped?7-r:r,bc=flipped?7-c:c;
  const boardEl=document.getElementById('chessBoard');
  const cell = boardEl.children[br * 8 + bc];
  if(!cell) return;
  const sw=document.createElement('div');sw.className='shockwave';
  sw.style.top='50%';sw.style.left='50%';
  cell.appendChild(sw);
  setTimeout(()=>sw.remove(),800);
}

// ========== SOCKET ==========
let socket=null,isOnline=false,myColor=null,myRoomCode='',myName='',opponentName='';
function initSocket(){
  socket=io();
  socket.on('connect',()=>updConn('online'));
  socket.on('disconnect',()=>updConn('offline'));
  socket.on('room_created',({code,color})=>{myColor=color;myRoomCode=code;document.getElementById('waitingCode').textContent=code;showScreen('waitingScreen');});
  socket.on('room_error',({msg})=>showLobbyErr(msg));
  socket.on('game_start',({yourColor,opponentName:oN,roomCode})=>{myColor=yourColor;opponentName=oN;myRoomCode=roomCode;isOnline=true;setupOnlineGame();showScreen('gameScreen');showNotif('بدأت اللعبة! أنت '+(yourColor==='w'?'أبيض 🐙':'أسود 🦑'));});
  socket.on('opponent_move',(md)=>applyOppMove(md));
  socket.on('player_disconnected',({msg})=>{showNotif('😢 '+msg,6000);updConn('offline');showGameOver('😢','انقطع الاتصال',msg);});
  socket.on('draw_offered',()=>document.getElementById('drawToast').classList.add('show'));
  socket.on('game_draw',()=>showGameOver('🤝','تعادل!','اتفق اللاعبان على التعادل.'));
  socket.on('opponent_resigned',()=>{const w=myColor==='w'?'الأخطبوط الأبيض 🐙':'الحبار الأسود 🦑';showGameOver('🏆','فزت!','استسلم الخصم! '+w+' يفوز!');});
  socket.on('game_over_notify',({msg})=>showNotif(msg));
  socket.on('chat_msg',({sender,color,text,time})=>addChat(sender,text,color,time,false));
}
function updConn(st){const b=document.getElementById('connBadge'),t=document.getElementById('connText');b.className='conn-badge '+st;t.textContent=st==='online'?'متصل':st==='waiting'?'انتظار':'منقطع';}

// ========== LOBBY ==========
function createRoom(){myName=(document.getElementById('playerNameInput').value.trim())||'لاعب البحر';if(!socket)initSocket();socket.emit('create_room',{playerName:myName});updConn('waiting');}
function joinRoom(){myName=(document.getElementById('playerNameInput').value.trim())||'لاعب البحر';const code=document.getElementById('joinCodeInput').value.trim().toUpperCase();if(code.length<4){showLobbyErr('❌ أدخل كوداً من 4 أحرف');return;}if(!socket)initSocket();socket.emit('join_room',{code,playerName:myName});}
function showLobbyErr(m){const e=document.getElementById('lobbyError');e.textContent=m;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),4000);}
function startOffline(){isOnline=false;myColor=null;myRoomCode='';myName=(document.getElementById('playerNameInput').value.trim())||'لاعب 1';opponentName='لاعب 2';setupOfflineGame();showScreen('gameScreen');}
function cancelWaiting(){if(socket)socket.disconnect();socket=null;showScreen('lobbyScreen');}
function copyCode(){navigator.clipboard.writeText(myRoomCode).then(()=>{const b=document.getElementById('copyBtn');b.textContent='✅ تم النسخ!';b.classList.add('copied');setTimeout(()=>{b.textContent='📋 نسخ الكود';b.classList.remove('copied');},2500);});}
function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));document.getElementById(id).classList.add('active');}
function goToLobby(){document.getElementById('goOverlay').classList.remove('active');showScreen('lobbyScreen');if(socket){socket.disconnect();socket=null;}isOnline=false;myColor=null;}

// ========== SETUP ==========
function setupOnlineGame(){
  resetState();flipped=(myColor==='b');
  document.getElementById('roomBadge').style.display='flex';document.getElementById('roomCodeBadge').textContent=myRoomCode;
  document.getElementById('resignBtn').style.display='block';document.getElementById('drawBtn').style.display='block';document.getElementById('chatPanel').style.display='block';
  if(myColor==='w'){document.getElementById('whiteName').textContent=myName+' (أنت)';document.getElementById('blackName').textContent=opponentName;document.getElementById('whiteCard').classList.add('you');document.getElementById('blackCard').classList.remove('you');}
  else{document.getElementById('blackName').textContent=myName+' (أنت)';document.getElementById('whiteName').textContent=opponentName;document.getElementById('blackCard').classList.add('you');document.getElementById('whiteCard').classList.remove('you');}
  document.getElementById('chatMsgs').innerHTML='';addChat('النظام','مرحباً '+myName+'! اللعبة بدأت ضد '+opponentName,null,'',true);
  renderBoard();updateUI();
}
function setupOfflineGame(){
  resetState();flipped=false;
  document.getElementById('roomBadge').style.display='none';document.getElementById('resignBtn').style.display='none';document.getElementById('drawBtn').style.display='none';document.getElementById('chatPanel').style.display='none';
  document.getElementById('whiteName').textContent=myName;document.getElementById('blackName').textContent=opponentName;
  document.getElementById('whiteCard').classList.remove('you');document.getElementById('blackCard').classList.remove('you');
  renderBoard();updateUI();
}

// ========== CHESS ==========
const PC={wK:'♔',wQ:'♕',wR:'♖',wB:'♗',wN:'♘',wP:'♙',bK:'♚',bQ:'♛',bR:'♜',bB:'♝',bN:'♞',bP:'♟'};
const INIT=[['bR','bN','bB','bQ','bK','bB','bN','bR'],['bP','bP','bP','bP','bP','bP','bP','bP'],[null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null],[null,null,null,null,null,null,null,null],['wP','wP','wP','wP','wP','wP','wP','wP'],['wR','wN','wB','wQ','wK','wB','wN','wR']];
let board,turn,selected,vMoves,capW,capB,mvHist,brdHist,stHist,flipped,epTgt,cRights,promoPend,gameOver;
function resetState(){board=INIT.map(r=>[...r]);turn='w';selected=null;vMoves=[];capW=[];capB=[];mvHist=[];brdHist=[];stHist=[];epTgt=null;cRights={wK:true,wR_left:true,wR_right:true,bK:true,bR_left:true,bR_right:true};promoPend=null;gameOver=false;document.getElementById('goOverlay').classList.remove('active');document.getElementById('promoModal').classList.remove('active');document.getElementById('drawToast').classList.remove('show');}
function renderBoard(){
  const bEl=document.getElementById('chessBoard');bEl.innerHTML='';
  const rEl=document.getElementById('rankLabels');const fEl=document.getElementById('fileLabels');rEl.innerHTML='';fEl.innerHTML='';
  const cs=Math.min(68,Math.max(46,Math.floor((Math.min(window.innerWidth,900)-260)/9)));
  const files=flipped?['h','g','f','e','d','c','b','a']:['a','b','c','d','e','f','g','h'];
  const ranks=flipped?['1','2','3','4','5','6','7','8']:['8','7','6','5','4','3','2','1'];
  ranks.forEach(r=>{const el=document.createElement('div');el.style.cssText='height:'+cs+'px;display:flex;align-items:center;justify-content:center;width:16px;font-size:.6rem;font-weight:700;color:rgba(0,255,231,.5);';el.textContent=r;rEl.appendChild(el);});
  files.forEach(f=>{const el=document.createElement('div');el.style.cssText='width:'+cs+'px;text-align:center;font-size:.6rem;font-weight:700;color:rgba(0,255,231,.5);padding:2px 0;';el.textContent=f;fEl.appendChild(el);});
  const myTurn=!isOnline||myColor===turn;
  const frm=document.getElementById('boardFrame');
  if(!myTurn&&isOnline&&!gameOver)frm.classList.add('disabled');else frm.classList.remove('disabled');
  for(let r=0;r<8;r++){for(let c=0;c<8;c++){
    const br=flipped?7-r:r,bc=flipped?7-c:c;const piece=board[br][bc];const isL=(r+c)%2===0;
    const cell=document.createElement('div');cell.className='cell '+(isL?'light':'dark');cell.style.width=cell.style.height=cs+'px';cell.style.fontSize=Math.floor(cs*.6)+'px';
    if(selected&&selected.row===br&&selected.col===bc)cell.classList.add('selected');
    const isVM=vMoves.some(m=>m.row===br&&m.col===bc&&!m.capture);
    const isCap=vMoves.some(m=>m.row===br&&m.col===bc&&m.capture);
    if(isVM)cell.classList.add('vm');if(isCap)cell.classList.add('vc');
    if(mvHist.length>0){const last=mvHist[mvHist.length-1];if((last.fr===br&&last.fc===bc)||(last.tr===br&&last.tc===bc)){if(!cell.classList.contains('selected')&&!isVM&&!isCap)cell.classList.add('lm');}}
    if(piece&&piece[1]==='K'&&isInCheck(piece[0],board))cell.classList.add('in-check');
    if(piece){const pEl=document.createElement('div');pEl.className='piece';pEl.textContent=PC[piece];pEl.style.filter=piece[0]==='w'?'drop-shadow(0 0 7px rgba(0,255,231,.8)) drop-shadow(0 2px 4px rgba(0,0,0,.9))':'drop-shadow(0 0 9px rgba(191,0,255,1)) drop-shadow(0 2px 4px rgba(0,0,0,.9)) hue-rotate(270deg) brightness(.62)';cell.appendChild(pEl);}
    cell.addEventListener('click',()=>handleClick(br,bc));bEl.appendChild(cell);
  }}
}
function handleClick(row,col){
  if(gameOver||promoPend)return;
  if(isOnline&&myColor!==turn)return;
  const piece=board[row][col];
  if(selected){const mv=vMoves.find(m=>m.row===row&&m.col===col);if(mv){execMove(selected.row,selected.col,row,col,mv);return;}}
  if(piece&&piece[0]===turn){selected={row,col};vMoves=getLegal(row,col,board,turn,epTgt,cRights);renderBoard();}
  else{selected=null;vMoves=[];renderBoard();}
}
function execMove(fr,fc,tr,tc,mv,fromOpp=false){
  brdHist.push(board.map(r=>[...r]));
  stHist.push({turn,epTgt:epTgt?{...epTgt}:null,cRights:{...cRights},capW:[...capW],capB:[...capB]});
  const piece=board[fr][fc],cap=board[tr][tc];
  const mr={fr,fc,tr,tc,piece,cap,notation:getN(fr,fc,tr,tc,piece,cap)};
  if(cap){turn==='w'?capW.push(cap):capB.push(cap);createShockwave(tr,tc);playCapture();}else{playSonar();}
  if(piece[1]==='P'&&mv.enP){const epR=turn==='w'?tr+1:tr-1;const epP=board[epR][tc];turn==='w'?capW.push(epP):capB.push(epP);board[epR][tc]=null;}
  board[tr][tc]=piece;board[fr][fc]=null;
  if(piece[1]==='K'&&Math.abs(tc-fc)===2){if(tc===6){board[fr][5]=board[fr][7];board[fr][7]=null;}else{board[fr][3]=board[fr][0];board[fr][0]=null;}}
  epTgt=piece[1]==='P'&&Math.abs(tr-fr)===2?{row:(fr+tr)/2,col:tc}:null;
  if(piece==='wK')cRights.wK=false;if(piece==='bK')cRights.bK=false;
  if(fr===7&&fc===0)cRights.wR_left=false;if(fr===7&&fc===7)cRights.wR_right=false;
  if(fr===0&&fc===0)cRights.bR_left=false;if(fr===0&&fc===7)cRights.bR_right=false;
  if((piece==='wP'&&tr===0)||(piece==='bP'&&tr===7)){
    if(fromOpp&&mv.promoTo){board[tr][tc]=mv.promoTo;mvHist.push(mr);turn=turn==='w'?'b':'w';selected=null;vMoves=[];renderBoard();updateUI();checkGO();return;}
    promoPend={row:tr,col:tc,color:piece[0],mr};mvHist.push(mr);turn=turn==='w'?'b':'w';selected=null;vMoves=[];renderBoard();updateUI();
    showPromo(piece[0],(pt)=>{if(isOnline&&socket&&!fromOpp)socket.emit('move_made',{...mr,promoTo:pt});});return;
  }
  mvHist.push(mr);
  if(isOnline&&socket&&!fromOpp)socket.emit('move_made',mr);
  turn=turn==='w'?'b':'w';selected=null;vMoves=[];renderBoard();updateUI();checkGO();
}
function applyOppMove(md){
  const {fr,fc,tr,tc,promoTo}=md;const piece=board[fr][fc];if(!piece)return;
  const mvs=getLegal(fr,fc,board,turn,epTgt,cRights);
  const mv=mvs.find(m=>m.row===tr&&m.col===tc)||{row:tr,col:tc,capture:!!board[tr][tc]};
  if(promoTo)mv.promoTo=promoTo;execMove(fr,fc,tr,tc,mv,true);
}
function getLegal(row,col,brd,clr,ep,cr){return getRaw(row,col,brd,clr,ep,cr).filter(m=>{const tb=brd.map(r=>[...r]);const p=tb[row][col];if(m.enP){const eR=clr==='w'?m.row+1:m.row-1;tb[eR][m.col]=null;}tb[m.row][m.col]=p;tb[row][col]=null;if(p[1]==='K'&&Math.abs(m.col-col)===2){if(m.col===6){tb[row][5]=tb[row][7];tb[row][7]=null;}else{tb[row][3]=tb[row][0];tb[row][0]=null;}}return !isInCheck(clr,tb);});}
function getRaw(row,col,brd,clr,ep,cr){const p=brd[row][col];if(!p)return[];const t=p[1];const opp=clr==='w'?'b':'w';const mvs=[];const addM=(r,c,fl={})=>{if(r<0||r>7||c<0||c>7)return false;const tgt=brd[r][c];if(tgt){if(tgt[0]===opp)mvs.push({row:r,col:c,capture:true,...fl});return false;}mvs.push({row:r,col:c,capture:false,...fl});return true;};const sld=(dr,dc)=>{for(let i=1;i<8;i++){const r=row+dr*i,c=col+dc*i;if(r<0||r>7||c<0||c>7)break;const tgt=brd[r][c];if(tgt){if(tgt[0]===opp)mvs.push({row:r,col:c,capture:true});break;}mvs.push({row:r,col:c,capture:false});}};if(t==='P'){const dir=clr==='w'?-1:1;const sr=clr==='w'?6:1;if(brd[row+dir]&&!brd[row+dir][col]){mvs.push({row:row+dir,col,capture:false});if(row===sr&&!brd[row+2*dir][col])mvs.push({row:row+2*dir,col,capture:false});}[-1,1].forEach(dc=>{const r=row+dir,c=col+dc;if(c<0||c>7)return;if(brd[r]&&brd[r][c]&&brd[r][c][0]===opp)mvs.push({row:r,col:c,capture:true});if(ep&&ep.row===r&&ep.col===c)mvs.push({row:r,col:c,capture:true,enP:true});});}if(t==='N')[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc])=>addM(row+dr,col+dc));if(t==='B'){sld(-1,-1);sld(-1,1);sld(1,-1);sld(1,1);}if(t==='R'){sld(-1,0);sld(1,0);sld(0,-1);sld(0,1);}if(t==='Q'){sld(-1,-1);sld(-1,1);sld(1,-1);sld(1,1);sld(-1,0);sld(1,0);sld(0,-1);sld(0,1);}if(t==='K'){[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc])=>addM(row+dr,col+dc));if(cr&&cr[clr+'K']&&!isInCheck(clr,brd)){const rR=clr==='w'?7:0;if(cr[clr+'R_right']&&!brd[rR][5]&&!brd[rR][6]){const t1=brd.map(r=>[...r]);t1[rR][5]=p;t1[rR][4]=null;const t2=brd.map(r=>[...r]);t2[rR][6]=p;t2[rR][4]=null;if(!isInCheck(clr,t1)&&!isInCheck(clr,t2))mvs.push({row:rR,col:6,capture:false,castle:true});}if(cr[clr+'R_left']&&!brd[rR][3]&&!brd[rR][2]&&!brd[rR][1]){const t1=brd.map(r=>[...r]);t1[rR][3]=p;t1[rR][4]=null;const t2=brd.map(r=>[...r]);t2[rR][2]=p;t2[rR][4]=null;if(!isInCheck(clr,t1)&&!isInCheck(clr,t2))mvs.push({row:rR,col:2,capture:false,castle:true});}}}return mvs;}
function isInCheck(color,brd){let kp=null;for(let r=0;r<8;r++){for(let c=0;c<8;c++){if(brd[r][c]===color+'K'){kp={r,c};break;}}if(kp)break;}if(!kp)return false;const opp=color==='w'?'b':'w';for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(brd[r][c]&&brd[r][c][0]===opp){const rm=getRaw(r,c,brd,opp,null,null);if(rm.some(m=>m.row===kp.r&&m.col===kp.c))return true;}return false;}
function checkGO(){let has=false;for(let r=0;r<8&&!has;r++)for(let c=0;c<8&&!has;c++)if(board[r][c]&&board[r][c][0]===turn&&getLegal(r,c,board,turn,epTgt,cRights).length>0)has=true;if(!has){gameOver=true;const res=isInCheck(turn,board)?'checkmate':'stalemate';if(socket&&isOnline)socket.emit('game_over',{result:res});if(res==='checkmate'){const w=turn==='w'?'الحبار الأسود 🦑':'الأخطبوط الأبيض 🐙';showGameOver('👑','كش مات!',w+' يفوز!');}else showGameOver('🤝','تعادل!','لا توجد حركات - تعادل بالإنهاك!');}}
function showPromo(color,cb){
  const modal=document.getElementById('promoModal');const ch=document.getElementById('promoChoices');ch.innerHTML='';
  ['Q','R','B','N'].forEach(t=>{const btn=document.createElement('button');btn.className='promo-btn';btn.textContent=PC[color+t];if(color==='b')btn.style.filter='hue-rotate(270deg) brightness(.62)';
    btn.onclick=()=>{const pt=color+t;board[promoPend.row][promoPend.col]=pt;if(cb)cb(pt);promoPend=null;modal.classList.remove('active');renderBoard();checkGO();};ch.appendChild(btn);});
  modal.classList.add('active');
}
function showGameOver(tr,ti,ms){document.getElementById('goTrophy').textContent=tr;document.getElementById('goTitle').textContent=ti;document.getElementById('goMsg').textContent=ms;document.getElementById('goOverlay').classList.add('active');document.getElementById('gameStateTxt').textContent='انتهت';}
function undoMove(){if(brdHist.length===0||gameOver)return;if(isOnline){showNotif('❌ التراجع غير متاح في وضع الإنترنت');return;}board=brdHist.pop();const s=stHist.pop();turn=s.turn;epTgt=s.epTgt;cRights=s.cRights;capW=s.capW;capB=s.capB;mvHist.pop();selected=null;vMoves=[];renderBoard();updateUI();}
function flipBoard(){flipped=!flipped;renderBoard();}
function resetGame(){if(isOnline)setupOnlineGame();else setupOfflineGame();}
function resignGame(){if(socket)socket.emit('resign');showGameOver('🏳️','استسلمت','فاز خصمك!');}
function offerDraw(){if(socket){socket.emit('offer_draw');showNotif('🤝 تم إرسال عرض التعادل!');}}
function acceptDraw(){if(socket)socket.emit('accept_draw');document.getElementById('drawToast').classList.remove('show');}
function refuseDraw(){document.getElementById('drawToast').classList.remove('show');}
function sendChat(){const i=document.getElementById('chatInput');const t=i.value.trim();if(!t||!socket)return;socket.emit('chat_msg',{text:t});i.value='';}
function addChat(sender,text,color,time,isSys){const el=document.getElementById('chatMsgs');const div=document.createElement('div');if(isSys){div.className='chat-msg sys';div.textContent=text;}else{const isMe=sender===myName||sender.startsWith(myName);div.className='chat-msg '+(isMe?'mine':'theirs');div.innerHTML='<div class="chat-sndr" style="color:'+(color==='w'?'var(--c)':'var(--p)')+'">'+sender+(time?' · '+time:'')+'</div>'+text;}el.appendChild(div);el.scrollTop=el.scrollHeight;}
let nTimer=null;
function showNotif(msg,dur=3500){const el=document.getElementById('notif');el.textContent=msg;el.classList.add('show');if(nTimer)clearTimeout(nTimer);nTimer=setTimeout(()=>el.classList.remove('show'),dur);}
function updateUI(){
  document.getElementById('whiteCard').classList.toggle('actv',turn==='w');document.getElementById('blackCard').classList.toggle('actv',turn==='b');
  const sEl=document.getElementById('statusBox');const ck=isInCheck(turn,board);
  if(ck){sEl.textContent=turn==='w'?'⚠️ الملك الأبيض في خطر!':'⚠️ الملك الأسود في خطر!';sEl.className='stat-box check';document.getElementById('boardFrame').classList.add('kraken-warning');}
  else{sEl.textContent=turn==='w'?'دور الأبيض 🐙':'دور الأسود 🦑';sEl.className='stat-box';document.getElementById('boardFrame').classList.remove('kraken-warning');}
  document.getElementById('whiteCap').textContent=capW.map(p=>PC[p]).join('');
  document.getElementById('blackCap').textContent=capB.map(p=>PC[p]).join('');
  document.getElementById('moveCount').textContent=mvHist.length;
  const hEl=document.getElementById('moveHistory');hEl.innerHTML='';
  for(let i=0;i<mvHist.length;i+=2){const row=document.createElement('div');row.className='mv-row';row.innerHTML='<span class="mv-n">'+( Math.floor(i/2)+1)+'.</span><span class="mv-w">'+(mvHist[i]?.notation||'')+'</span><span class="mv-b">'+(mvHist[i+1]?.notation||'')+'</span>';hEl.appendChild(row);}
  hEl.scrollTop=hEl.scrollHeight;
}
function getN(fr,fc,tr,tc,piece,cap){const f='abcdefgh';const p=piece[1]==='P'?'':piece[1];const x=cap?'x':'';const from=piece[1]==='P'&&cap?f[fc]:p;return from+x+f[tc]+(8-tr);}
function createBubbles(){for(let i=0;i<25;i++){const b=document.createElement('div');b.className='bubble';const s=Math.random()*12+4;b.style.cssText='width:'+s+'px;height:'+s+'px;left:'+Math.random()*100+'vw;bottom:-20px;background:radial-gradient(circle at 35% 35%,rgba(255,255,255,.6),rgba(0,220,220,.1));border:1px solid rgba(0,255,231,.22);animation-duration:'+(Math.random()*10+8)+'s;animation-delay:'+(Math.random()*12)+'s;';document.body.appendChild(b);}}
function createFish(){['🐠','🐡','🐟','🦈','🐬','🐳'].forEach(e=>{const f=document.createElement('div');f.className='fish';f.textContent=e;f.style.cssText='top:'+(Math.random()*80+5)+'vh;animation-duration:'+(Math.random()*20+15)+'s;animation-delay:'+(Math.random()*15)+'s;font-size:'+(Math.random()*12+14)+'px;';document.body.appendChild(f);});}
function createJellyfish(){['🪼','⭐','🔮','💎','🫧'].forEach(e=>{const j=document.createElement('div');j.className='jelly';j.textContent=e;j.style.cssText='left:'+(Math.random()*90+5)+'vw;top:'+(Math.random()*70+5)+'vh;animation-duration:'+(Math.random()*4+3)+'s;animation-delay:'+(Math.random()*3)+'s;font-size:'+(Math.random()*16+18)+'px;';document.body.appendChild(j);});}
document.addEventListener('keydown',e=>{if(e.ctrlKey&&e.key==='z')undoMove();if(e.key==='Escape'){selected=null;vMoves=[];renderBoard();}});
document.getElementById('joinCodeInput')?.addEventListener('input',function(){this.value=this.value.toUpperCase();});
window.addEventListener('load',()=>{createBubbles();createFish();createJellyfish();});
window.addEventListener('resize',()=>{if(document.getElementById('gameScreen').classList.contains('active'))renderBoard();});
