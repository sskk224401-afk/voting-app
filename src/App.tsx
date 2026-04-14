import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  increment
} from 'firebase/firestore';

// 🛑🛑 إعدادات Firebase الخاصة بك 🛑🛑
const firebaseConfig = {
  apiKey: "AIzaSyDyfqZ7K9R1_l_AIuRVsVCY8BaXgL4Gvcs",
  authDomain: "planning-with-ai-625ee.firebaseapp.com",
  projectId: "planning-with-ai-625ee",
  storageBucket: "planning-with-ai-625ee.firebasestorage.app",
  messagingSenderId: "1093175165204",
  appId: "1:1093175165204:web:3b6ae94b15f520ced94201"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'my-voting-app-v1';

const Icons = {
  CheckCircle: () => <svg className="w-5 h-5 inline-block ml-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>,
  Upload: () => <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>,
  Link: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 105.656 5.656l-1.1 1.1" /></svg>,
  // 🔴 أيقونة النجمة تمت إضافتها هنا
  Sparkles: () => <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authFailed, setAuthFailed] = useState(false);
  
  const [view, setView] = useState('home'); 
  
  const [inputCode, setInputCode] = useState('');
  const [pollId, setPollId] = useState('');
  const [pollData, setPollData] = useState(null);
  const [votes, setVotes] = useState({ person1: 0, person2: 0 });
  const [hasVoted, setHasVoted] = useState(false);
  const [publicError, setPublicError] = useState('');

  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [c1, setC1] = useState({ name: '', image: '', color: 'green' });
  const [c2, setC2] = useState({ name: '', image: '', color: 'dark' });
  const [createdCode, setCreatedCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const [secretClicks, setSecretClicks] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);
  const clickTimer = useRef(null);

  useEffect(() => {
    let initialLoad = true;
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) { 
        console.error("Auth Error:", e);
        setAuthFailed(true);
        setLoading(false);
      }
    };
    
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setAuthFailed(false);
        if (initialLoad) {
          initialLoad = false;
          const params = new URLSearchParams(window.location.search);
          const pollCodeFromUrl = params.get('poll');
          if (pollCodeFromUrl) {
            setInputCode(pollCodeFromUrl);
            handleJoin(pollCodeFromUrl, u);
          } else {
            setLoading(false);
          }
        }
      } else if (!initialLoad) {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || view !== 'vote' || !pollId) return;

    const totalsRef = doc(db, 'polls', pollId);
    const userVoteRef = doc(db, 'users', user.uid, 'voted_polls', pollId);

    const unsub = onSnapshot(totalsRef, (snap) => {
      if (snap.exists()) setVotes(snap.data().results || { person1: 0, person2: 0 });
    }, (err) => console.error(err));

    getDoc(userVoteRef).then(snap => {
      if (snap.exists()) setHasVoted(true);
    }).catch(err => console.error("Vote Check Error:", err));

    return () => unsub();
  }, [user, view, pollId]);

  const handleImg = (e, setter) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = 500 / img.width; 
        canvas.width = 500;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        setter(prev => ({ ...prev, image: canvas.toDataURL('image/jpeg', 0.8) }));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleJoin = async (overrideCode, currentUser = user) => {
    if (!currentUser) {
      setPublicError('جاري تهيئة الاتصال...');
      return;
    }

    const codeToUse = typeof overrideCode === 'string' ? overrideCode : inputCode;
    const code = codeToUse.replace(/\s/g, '').trim().toUpperCase();
    
    if (!code) return;
    
    setLoading(true);
    setPublicError('');
    
    try {
      const pollRef = doc(db, 'polls', code);
      const snap = await getDoc(pollRef);
      if (snap.exists()) {
        setPollData(snap.data().config);
        setPollId(code);
        setView('vote');
      } else {
        setPublicError(`الكود غير صحيح أو التصويت منتهي.`);
      }
    } catch (e) {
      console.error("Join Error:", e);
      setPublicError('حدث خطأ في الاتصال.');
    } finally {
      setLoading(false);
    }
  };
};

  const submitVote = async (cid) => {
    if (hasVoted || !user) return;
    try {
      const totalsRef = doc(db, 'polls', pollId);
      const userVoteRef = doc(db, 'users', user.uid, 'voted_polls', pollId);
      
      await setDoc(totalsRef, { results: { [cid]: increment(1) } }, { merge: true });
      await setDoc(userVoteRef, { voted: true, time: Date.now() });
      setHasVoted(true);
    } catch (e) {
      alert("فشل التصويت، تأكد من الاتصال بالإنترنت.");
      console.error(e);
    }
  };

  // 🔴 5 ضغطات متتالية سريعة على النجمة
  const handleSecretClick = () => {
    const newCount = secretClicks + 1;
    setSecretClicks(newCount);
    
    if (clickTimer.current) clearTimeout(clickTimer.current);

    if (newCount >= 5) {
      setView('admin_login');
      setSecretClicks(0); 
    } else {
      // المهلة بين الضغطات نصف ثانية (500ms)
      clickTimer.current = setTimeout(() => setSecretClicks(0), 500); 
    }
  };

  const handleAdminLogin = () => {
    if (adminPassword === 'Ss1234567890mnbvcxz@@@') {
      setView('admin_dashboard');
      setAdminError('');
    } else {
      setAdminError('الرقم السري خاطئ');
    }
  };

  const handleCreatePoll = async () => {
    if (!c1.name || !c2.name || !c1.image || !c2.image) {
      setAdminError('يرجى إكمال جميع بيانات وصور المرشحين.');
      return;
    }
    setIsCreating(true);
    setAdminError('');
    try {
      const code = Math.random().toString(36).substring(2, 7).toUpperCase();
      const pollRef = doc(db, 'polls', code);

      await setDoc(pollRef, { 
        config: { c1, c2, creator: user.uid, created: Date.now() },
        results: { person1: 0, person2: 0 }
      });

      setCreatedCode(code);
      setC1({ name: '', image: '', color: 'green' });
      setC2({ name: '', image: '', color: 'dark' });
    } catch (e) {
      console.error(e);
      setAdminError('فشل إنشاء التصويت.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = (link) => {
    navigator.clipboard.writeText(link).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  if (loading && !authFailed) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f7f6]">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen font-sans bg-[#f8f9fb] text-slate-800" dir="rtl">
      
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-16">

        {/* واجهة الدخول الرئيسية */}
        {view === 'home' && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-500 mt-10 md:mt-20">
            
            {/* 🔴 النجمة المجاورة للعنوان */}
            <div className="flex items-center justify-center mb-10">
              {/* النجمة الآن على اليمين وبدون أي تأثيرات عند الوقوف عليها */}
              <div 
                onClick={handleSecretClick}
                className="ml-3 text-[#1a56db] cursor-default"
              >
                <Icons.Sparkles />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#1a56db] tracking-wide cursor-default select-none">
                تطبيق التصويت المباشر
              </h1>
            </div>
            
            <div className="bg-white w-full max-w-2xl rounded-[1.5rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 p-8 md:p-10">
              <h2 className="text-xl md:text-2xl font-bold text-center text-slate-900 mb-8">
                هل لديك كود تصويت؟
              </h2>
              
              <div className="flex flex-col md:flex-row gap-4">
                <input 
                  type="text" 
                  placeholder="أدخل الكود هنا"
                  className="flex-1 px-6 py-4 bg-white border border-slate-200 rounded-xl text-center text-lg tracking-widest uppercase outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all placeholder:text-slate-300 placeholder:tracking-normal font-medium"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                />
                <button 
                  onClick={() => handleJoin()}
                  disabled={!user} 
                  className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-8 py-4 rounded-xl font-bold text-lg transition-colors shadow-sm whitespace-nowrap disabled:opacity-50"
                >
                  دخول للتصويت
                </button>
              </div>
              
              {publicError && (
                <p className="mt-4 text-red-500 text-center font-bold text-sm">
                  {publicError}
                </p>
              )}
            </div>
          </div>
        )}

        {/* واجهة التصويت */}
        {view === 'vote' && pollData && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="flex justify-start mb-6">
              <button 
                onClick={() => {setView('home'); setPollId(''); setInputCode('');}} 
                className="text-slate-400 hover:text-blue-600 font-bold text-sm transition-colors"
              >
                &rarr; عودة
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 md:gap-8 mb-6">
              <div className="bg-white rounded-[24px] p-4 shadow-sm border border-slate-100 flex flex-col">
                <div className="w-full aspect-square bg-[#111] rounded-[16px] overflow-hidden relative mb-5">
                  <img src={pollData.c1.image} alt={pollData.c1.name} className="w-full h-full object-cover" />
                  <span className="absolute top-3 right-3 bg-white text-slate-900 px-3 py-1 rounded-full text-[10px] md:text-xs font-bold shadow-sm">
                    المرشح الأول
                  </span>
                </div>
                <h3 className="text-center text-lg md:text-xl font-bold text-slate-900 mb-5">
                  {pollData.c1.name}
                </h3>
                <button 
                  onClick={() => submitVote('person1')}
                  disabled={hasVoted || !user}
                  className={`w-full py-3 md:py-4 rounded-xl font-bold text-sm md:text-base transition-all flex items-center justify-center gap-2 mt-auto
                    ${hasVoted 
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                      : 'bg-[#10b981] hover:bg-[#059669] text-white shadow-sm'}`}
                >
                  <Icons.CheckCircle /> تصويت لهذا
                </button>
              </div>

              <div className="bg-white rounded-[24px] p-4 shadow-sm border border-slate-100 flex flex-col">
                <div className="w-full aspect-square bg-[#0a0a0a] rounded-[16px] overflow-hidden relative mb-5">
                  <img src={pollData.c2.image} alt={pollData.c2.name} className="w-full h-full object-cover" />
                  <span className="absolute top-3 right-3 bg-white text-slate-900 px-3 py-1 rounded-full text-[10px] md:text-xs font-bold shadow-sm">
                    المرشح الثاني
                  </span>
                </div>
                <h3 className="text-center text-lg md:text-xl font-bold text-slate-900 mb-5">
                  {pollData.c2.name}
                </h3>
                <button 
                  onClick={() => submitVote('person2')}
                  disabled={hasVoted || !user}
                  className={`w-full py-3 md:py-4 rounded-xl font-bold text-sm md:text-base transition-all flex items-center justify-center gap-2 mt-auto
                    ${hasVoted 
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                      : 'bg-[#0f172a] hover:bg-black text-white shadow-sm'}`}
                >
                  <Icons.CheckCircle /> تصويت لهذا
                </button>
              </div>
            </div>

            <div className="bg-white rounded-[24px] p-6 md:p-8 shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-lg md:text-xl font-bold text-slate-900">تحليل النتائج</h3>
                 <span className="bg-[#f1f5f9] text-slate-500 px-4 py-1.5 rounded-full text-xs font-bold border border-slate-200">
                   إجمالي: {(votes.person1 || 0) + (votes.person2 || 0)}
                 </span>
              </div>

              <div className="space-y-6">
                {[ 
                  {id: 'person2', data: pollData.c2, v: votes.person2 || 0, barColor: 'bg-slate-800'},
                  {id: 'person1', data: pollData.c1, v: votes.person1 || 0, barColor: 'bg-[#10b981]'}
                ].map((c, idx) => {
                  const total = (votes.person1 || 0) + (votes.person2 || 0);
                  const percent = total > 0 ? Math.round((c.v / total) * 100) : 0;
                  return (
                    <div key={idx}>
                      <div className="flex justify-between items-end mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-xs font-medium">({c.v})</span>
                          <span className="text-base md:text-lg font-bold text-slate-800">{percent}%</span>
                        </div>
                        <span className="text-sm md:text-base font-bold text-slate-700">{c.data.name}</span>
                      </div>
                      <div className="h-2 w-full bg-[#f1f5f9] rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${c.barColor} rounded-full transition-all duration-1000 ease-out`}
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* شاشة تسجيل دخول الإدارة */}
        {view === 'admin_login' && (
          <div className="w-full max-w-sm mx-auto animate-in zoom-in-95 duration-300 mt-20">
            <div className="bg-white p-8 rounded-[24px] shadow-sm border border-slate-100 text-center">
              <h2 className="text-2xl font-bold mb-8 text-slate-800">الإدارة</h2>
              <input 
                type="password" 
                placeholder="الرقم السري"
                className="w-full p-4 text-center bg-slate-50 border border-slate-200 rounded-xl mb-6 focus:border-blue-500 outline-none font-bold tracking-widest text-lg"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
              />
              {adminError && <p className="text-red-500 text-sm mb-4 font-bold">{adminError}</p>}
              <button 
                onClick={handleAdminLogin}
                className="w-full bg-[#0f172a] text-white py-4 rounded-xl font-bold text-lg hover:bg-black mb-4 transition-colors"
              >
                دخول
              </button>
              <button onClick={() => setView('home')} className="text-slate-400 text-sm hover:text-slate-600 font-bold">إلغاء</button>
            </div>
          </div>
        )}

        {/* لوحة تحكم إنشاء الأكواد */}
        {view === 'admin_dashboard' && (
          <div className="animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm">
              <h2 className="text-xl font-bold text-slate-800">إنشاء تصويت جديد</h2>
              <button onClick={() => setView('home')} className="bg-slate-100 px-4 py-2 rounded-lg text-slate-600 font-bold text-sm">خروج</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100">
                 <h3 className="font-bold text-lg mb-4 text-[#10b981]">المرشح الأول (الزر الأخضر)</h3>
                 <div className="w-full aspect-square bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden mb-4 cursor-pointer hover:bg-slate-100">
                    {c1.image ? <img src={c1.image} className="w-full h-full object-cover" alt="c1" /> : 
                      <div className="text-center"><Icons.Upload /><span className="text-slate-500 text-sm">اختر صورة</span></div>
                    }
                    <input type="file" accept="image/*" onChange={(e) => handleImg(e, setC1)} className="absolute inset-0 opacity-0 cursor-pointer" />
                 </div>
                 <input 
                   type="text" placeholder="اسم المرشح" 
                   className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-right font-bold outline-none focus:border-[#10b981]"
                   value={c1.name} onChange={e => setC1({...c1, name: e.target.value})}
                 />
              </div>

              <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100">
                 <h3 className="font-bold text-lg mb-4 text-[#0f172a]">المرشح الثاني (الزر الأسود)</h3>
                 <div className="w-full aspect-square bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden mb-4 cursor-pointer hover:bg-slate-100">
                    {c2.image ? <img src={c2.image} className="w-full h-full object-cover" alt="c2" /> : 
                      <div className="text-center"><Icons.Upload /><span className="text-slate-500 text-sm">اختر صورة</span></div>
                    }
                    <input type="file" accept="image/*" onChange={(e) => handleImg(e, setC2)} className="absolute inset-0 opacity-0 cursor-pointer" />
                 </div>
                 <input 
                   type="text" placeholder="اسم المرشح" 
                   className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-right font-bold outline-none focus:border-[#0f172a]"
                   value={c2.name} onChange={e => setC2({...c2, name: e.target.value})}
                 />
              </div>
            </div>

            {adminError && <p className="text-red-500 text-center mb-6 font-bold">{adminError}</p>}
            
            <button 
              onClick={handleCreatePoll}
              disabled={isCreating}
              className="w-full bg-[#2563eb] text-white py-4 rounded-2xl font-bold text-xl hover:bg-[#1d4ed8] transition-colors disabled:opacity-50"
            >
              {isCreating ? 'جاري الإنشاء...' : 'إنشاء التصويت'}
            </button>

            {createdCode && (
              <div className="mt-8 bg-white border border-slate-100 shadow-sm p-8 rounded-[24px] text-center animate-in zoom-in-95">
                <p className="text-slate-500 font-bold mb-4">تم إنشاء التصويت بنجاح!</p>
                <div className="bg-slate-50 rounded-xl py-6 mb-6">
                  <h1 className="text-5xl font-black text-slate-800 tracking-[0.3em] font-mono">{createdCode}</h1>
                </div>
                
                <div className="max-w-md mx-auto">
                  <p className="text-sm text-slate-400 mb-2">رابط المشاركة المباشر</p>
                  <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl">
                    <input 
                      type="text" 
                      readOnly 
                      value={`${window.location.origin}${window.location.pathname}?poll=${createdCode}`}
                      className="flex-1 bg-transparent border-none outline-none text-blue-600 font-medium text-xs px-2"
                      dir="ltr"
                    />
                    <button 
                      onClick={() => handleCopyLink(`${window.location.origin}${window.location.pathname}?poll=${createdCode}`)}
                      className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors ${copySuccess ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'}`}
                    >
                      {copySuccess ? 'تم' : 'نسخ'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}