-- Bounded one-time audio preparation. Operator grants are made separately by
-- immutable Auth user ID after owner identity verification; no email in code.
begin;
create table academy_exams.audio_operators(
 user_id uuid primary key references auth.users(id) on delete cascade,
 granted_at timestamptz not null default now()
);
create table academy_exams.audio_assets(
 path text primary key,
 exam text not null references academy_exams.catalog(exam),
 version text not null,
 ordinal integer not null check(ordinal between 1 and 40),
 script_hash text not null check(script_hash ~ '^[0-9a-f]{64}$'),
 status text not null default 'pending' check(status in ('pending','generating','ready','failed')),
 claim_id uuid,
 claimed_by uuid references auth.users(id),
 claimed_at timestamptz,
 audio_hash text check(audio_hash is null or audio_hash ~ '^[0-9a-f]{64}$'),
 bytes integer check(bytes between 1000 and 10000000),
 previewed_by uuid references auth.users(id),
 previewed_at timestamptz,
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 unique(exam,version,ordinal)
);
alter table academy_exams.audio_operators enable row level security;
alter table academy_exams.audio_assets enable row level security;
revoke all on academy_exams.audio_operators,academy_exams.audio_assets from public,anon,authenticated,service_role;

create function public.academy_exam_audio_command(p_user uuid,p_action text,p_path text default null,p_hash text default null,p_claim uuid default null,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare a academy_exams.audio_assets; job uuid;
begin
 -- User metadata and a submitted email cannot grant this capability.
 perform 1 from academy_exams.audio_operators o join auth.users u on u.id=o.user_id
 where o.user_id=p_user and u.email_confirmed_at is not null for update of o;
 if not found then raise exception 'Audio operator permission required' using errcode='42501';end if;
 if p_action='state' then
  return jsonb_build_object('assets',(select coalesce(jsonb_agg(jsonb_build_object('path',path,'exam',exam,'ordinal',ordinal,'scriptHash',script_hash,'status',status,'audioHash',audio_hash,'bytes',bytes,'reviewed',reviewed_at is not null,'claimedAt',claimed_at) order by exam,ordinal),'[]') from academy_exams.audio_assets));
 end if;
 if p_action='claim' then perform pg_advisory_xact_lock(57231014);end if;
 select * into a from academy_exams.audio_assets where path=p_path for update;
 if not found then raise exception 'Invalid recording';end if;
 if p_action='claim' then
  if a.script_hash is distinct from p_hash then raise exception 'Recording script changed';end if;
  if a.status<>'pending' or exists(select 1 from academy_exams.audio_assets where status='generating') then return jsonb_build_object('claimed',false);end if;
  job:=gen_random_uuid();
  update academy_exams.audio_assets set status='generating',claim_id=job,claimed_by=p_user,claimed_at=now() where path=p_path;
  return jsonb_build_object('claimed',true,'id',job);
 end if;
 if p_action in ('finish','fail') then
  if a.status<>'generating' or a.claim_id is distinct from p_claim or a.claimed_by is distinct from p_user or a.script_hash is distinct from p_hash then raise exception 'Invalid recording claim';end if;
  if p_action='finish' then
   if p_data->>'sha256' is null or p_data->>'sha256' !~ '^[0-9a-f]{64}$' or p_data->>'bytes' is null then raise exception 'Invalid recording output';end if;
   update academy_exams.audio_assets set status='ready',audio_hash=p_data->>'sha256',bytes=(p_data->>'bytes')::integer where path=p_path;
  else update academy_exams.audio_assets set status='failed' where path=p_path;
  end if;
  return jsonb_build_object('saved',true);
 end if;
 if a.status<>'ready' or a.audio_hash is distinct from p_hash then raise exception 'Recording is not ready or changed';end if;
 if p_action='preview' then
  update academy_exams.audio_assets set previewed_by=p_user,previewed_at=now() where path=p_path;
  return jsonb_build_object('ready',true);
 end if;
 if p_action='review' then
  if a.previewed_by is distinct from p_user or a.previewed_at is null then raise exception 'Please preview this recording first';end if;
  update academy_exams.audio_assets set reviewed_by=p_user,reviewed_at=now() where path=p_path;
  -- Approval of audio alone cannot enable or price a student exam.
  update academy_exams.catalog set audio_reviewed=not exists(select 1 from academy_exams.audio_assets x where x.exam=a.exam and x.version=a.version and (x.status<>'ready' or x.reviewed_at is null)) where exam=a.exam and version=a.version;
  return jsonb_build_object('saved',true);
 end if;
 raise exception 'Invalid audio action';
end;$$;
revoke all on function public.academy_exam_audio_command(uuid,text,text,text,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.academy_exam_audio_command(uuid,text,text,text,uuid,jsonb) to service_role;

-- Fixed, versioned manifest: exactly 79 assets. Claims cannot insert new jobs,
-- replace a completed file, or automatically repeat a failed paid request.

insert into academy_exams.audio_assets(path,exam,version,ordinal,script_hash) values
('tef-canada-hzad-01-20261105/l1.mp3','tef-canada','tef-canada-hzad-01-20261105',1,'3e05836b379611c80a3d1b11b90e6cf2782d2cefb27a3cceec924b1322e31f5b'),
('tef-canada-hzad-01-20261105/l2.mp3','tef-canada','tef-canada-hzad-01-20261105',2,'8875091134f56af8c910fae3e2ee685fd6fd04c52db08278fc2309fd65cb2584'),
('tef-canada-hzad-01-20261105/l3.mp3','tef-canada','tef-canada-hzad-01-20261105',3,'725416392379b35601a0820e6c1be75b770a113ba9c87594e848ac73797c772e'),
('tef-canada-hzad-01-20261105/l4.mp3','tef-canada','tef-canada-hzad-01-20261105',4,'030d6e8b69ff72ca6a8c561fc8d989370560d2a6175a181f93856f8aa499edbf'),
('tef-canada-hzad-01-20261105/l5.mp3','tef-canada','tef-canada-hzad-01-20261105',5,'f7c4f8f507fe3a65dde63dd591442b3ba53d9b36fc019e3dd77035eec1212295'),
('tef-canada-hzad-01-20261105/l6.mp3','tef-canada','tef-canada-hzad-01-20261105',6,'4dfbb6e660ad744db220438b427f6d3c83eac617c14298541475899c17393384'),
('tef-canada-hzad-01-20261105/l7.mp3','tef-canada','tef-canada-hzad-01-20261105',7,'87977e3b7534af7b3fc2a72a6f113d2e5cdc67826af278de8d1b3a5673d27e15'),
('tef-canada-hzad-01-20261105/l8.mp3','tef-canada','tef-canada-hzad-01-20261105',8,'da3024a3e52b351ab237b66f5beb30750585d0bc658a9c0fc6eb81e1d911bfbc'),
('tef-canada-hzad-01-20261105/l9.mp3','tef-canada','tef-canada-hzad-01-20261105',9,'49a82555b19298865ab53fde3a39b90a25176d0d8ee5c550ea1d6112adb3d9ff'),
('tef-canada-hzad-01-20261105/l10.mp3','tef-canada','tef-canada-hzad-01-20261105',10,'549297a640f5870bbb1b9064c9c2d9301dbc5dd57c9dd4dd0829259f9bfcdb78'),
('tef-canada-hzad-01-20261105/l11.mp3','tef-canada','tef-canada-hzad-01-20261105',11,'6142b4125e7548c05a7b8c9d4f5b718a48bd67ea3c91f4e7c4bd75cbf7080cfa'),
('tef-canada-hzad-01-20261105/l12.mp3','tef-canada','tef-canada-hzad-01-20261105',12,'1737141ca236545eccb5d1159932b84dd5ab3489ac1b377e0f30be00d7dbaa99'),
('tef-canada-hzad-01-20261105/l13.mp3','tef-canada','tef-canada-hzad-01-20261105',13,'9788e71eb4942b580b3e6b80a157da554c87f6a5b5dcde21585fa59ca2fcd274'),
('tef-canada-hzad-01-20261105/l14.mp3','tef-canada','tef-canada-hzad-01-20261105',14,'e410c7da5f9d33b91b35cd5218a6b3b2643538260d9d56d85cefbdd89b652744'),
('tef-canada-hzad-01-20261105/l15.mp3','tef-canada','tef-canada-hzad-01-20261105',15,'d279ac081aa56247bbb1882a5d3acd5c68bb47a0a191a65bf7e2163cac9b5adf'),
('tef-canada-hzad-01-20261105/l16.mp3','tef-canada','tef-canada-hzad-01-20261105',16,'2e63d2d9fe809698324f13806efc41061e8b78574b536345543f913402c61683'),
('tef-canada-hzad-01-20261105/l17.mp3','tef-canada','tef-canada-hzad-01-20261105',17,'c3da9078c6e2097b93f30dafb3cab831ac7b4ffe64200c3fa38fb2b04cb2d909'),
('tef-canada-hzad-01-20261105/l18.mp3','tef-canada','tef-canada-hzad-01-20261105',18,'eb243490625ea0ad74df582d90cad602f507fc485f3a611ae85277453b56483f'),
('tef-canada-hzad-01-20261105/l19.mp3','tef-canada','tef-canada-hzad-01-20261105',19,'08c077f891545d841869e0359c301f59fe5cfed9fef4a691fedb15ded0eb2d05'),
('tef-canada-hzad-01-20261105/l20.mp3','tef-canada','tef-canada-hzad-01-20261105',20,'e7ea50bcaf5213ca71c3db23e8cfa86914217cfb52568e61b029cd716b120c8b'),
('tef-canada-hzad-01-20261105/l21.mp3','tef-canada','tef-canada-hzad-01-20261105',21,'9e6194b6e211529e544a0346c2308edb8cacca2db448428ffba7df41c134007f'),
('tef-canada-hzad-01-20261105/l22.mp3','tef-canada','tef-canada-hzad-01-20261105',22,'d2854f292c9039ba8244fdda72826ad124eeb464134e0dd829796c6a2e83d101'),
('tef-canada-hzad-01-20261105/l23.mp3','tef-canada','tef-canada-hzad-01-20261105',23,'577ee6df44475d0307565b764fcfd5bdc1d09f75d50dbe03200ef9e96e3ffff8'),
('tef-canada-hzad-01-20261105/l24.mp3','tef-canada','tef-canada-hzad-01-20261105',24,'ed540cf41af80754d379a258d6720d69fae15861e42711af3fafbad04907c538'),
('tef-canada-hzad-01-20261105/l25.mp3','tef-canada','tef-canada-hzad-01-20261105',25,'9f3424dfbbee1acfd35de8598e7082cae9615e7179bf5f06dbad2a0e8f413fea'),
('tef-canada-hzad-01-20261105/l26.mp3','tef-canada','tef-canada-hzad-01-20261105',26,'46ae04e463980c29841d60cf68606bfa6b4bdd4a07c328e2ff53d9a114892c9e'),
('tef-canada-hzad-01-20261105/l27.mp3','tef-canada','tef-canada-hzad-01-20261105',27,'51c3c047922104eb801e0a8d5c7116a614257ce360947d85d3625bfac74fe05b'),
('tef-canada-hzad-01-20261105/l28.mp3','tef-canada','tef-canada-hzad-01-20261105',28,'3ffcecaca7c73622ce92543fb1fef7752a19dd2644f3d7f344059264f9bf6de0'),
('tef-canada-hzad-01-20261105/l29.mp3','tef-canada','tef-canada-hzad-01-20261105',29,'1b2efde93a59d4c864902cd8b9b50473095be4680bb5cc933172c6c7ae4b9ef8'),
('tef-canada-hzad-01-20261105/l30.mp3','tef-canada','tef-canada-hzad-01-20261105',30,'dbee1b1a70f436927c56ecbd3f54de361d6167d2b34b71b3624cb7c83811a4e3'),
('tef-canada-hzad-01-20261105/l31.mp3','tef-canada','tef-canada-hzad-01-20261105',31,'9511305b1375a71ffe96d736d26cd4cc3a970fd174dcf43e3c91b03935b0229b'),
('tef-canada-hzad-01-20261105/l32.mp3','tef-canada','tef-canada-hzad-01-20261105',32,'579371d5c65e9173ca69f8e7ae2ad54b171a25a9613655dc8eda428de6c7ad7e'),
('tef-canada-hzad-01-20261105/l33.mp3','tef-canada','tef-canada-hzad-01-20261105',33,'b51845f299b8e457b36ea7041f20950056559e0b7ade9f589426bf6a59d531cb'),
('tef-canada-hzad-01-20261105/l34.mp3','tef-canada','tef-canada-hzad-01-20261105',34,'b6a42cf51c861428663fb8cdd416b268fc29232e469b5a3e7573390cc0817798'),
('tef-canada-hzad-01-20261105/l35.mp3','tef-canada','tef-canada-hzad-01-20261105',35,'2e742da204cb6ee823c75e292e4c07233834ef934fb6556eff01dc2b739ba562'),
('tef-canada-hzad-01-20261105/l36.mp3','tef-canada','tef-canada-hzad-01-20261105',36,'f0f8438a88db139faf6b88dffb15e1abff12629ff143bc4aabb7da0244c81c12'),
('tef-canada-hzad-01-20261105/l37.mp3','tef-canada','tef-canada-hzad-01-20261105',37,'12326a91d0cad83e2ebb7d59ec38c78a25ca9a962fe24c5c8098936a9eb1151d'),
('tef-canada-hzad-01-20261105/l38.mp3','tef-canada','tef-canada-hzad-01-20261105',38,'fb126d05593c9506b289d879b94e3e7a1b52d50785afe0d5fab1a61bb446c4de'),
('tef-canada-hzad-01-20261105/l39.mp3','tef-canada','tef-canada-hzad-01-20261105',39,'8484c386139a5ca5893208ee16a0a00f63279b179fbf70863044317f6715eb46'),
('tef-canada-hzad-01-20261105/l40.mp3','tef-canada','tef-canada-hzad-01-20261105',40,'e9e952a2c72c83ba33df84cc06c33e3dd209eb2873e5c45badec13e88ea26e7c'),
('tcf-canada-hzad-01-20261105/l1.mp3','tcf-canada','tcf-canada-hzad-01-20261105',1,'5aa12306a50b353b7a2bebb34d41e86b41c3fbb9c29a133cfe8b56a6a96fc406'),
('tcf-canada-hzad-01-20261105/l2.mp3','tcf-canada','tcf-canada-hzad-01-20261105',2,'e099e68f72e6f652519ff642d8139b92ef510701cb10915ff7cf8e53fd0cf4dc'),
('tcf-canada-hzad-01-20261105/l3.mp3','tcf-canada','tcf-canada-hzad-01-20261105',3,'33132f9205f197df71e7105ede39a103f7eb4bc025030c08b967e53394e89d16'),
('tcf-canada-hzad-01-20261105/l4.mp3','tcf-canada','tcf-canada-hzad-01-20261105',4,'9b777fe216896913a033312f0e6cf31575f5135ff097775c20d73b66544b01e0'),
('tcf-canada-hzad-01-20261105/l5.mp3','tcf-canada','tcf-canada-hzad-01-20261105',5,'8278a02744fc69bea5d342971b55f79c540f388b43eea4da3204b2805e217c0b'),
('tcf-canada-hzad-01-20261105/l6.mp3','tcf-canada','tcf-canada-hzad-01-20261105',6,'35b82fdbc0f843725596cfb8d751f3ee1875debad8e38d6b5d693a62d0bdd6b5'),
('tcf-canada-hzad-01-20261105/l7.mp3','tcf-canada','tcf-canada-hzad-01-20261105',7,'f7cc705b182ab5b5b61849ce83129e5dbdb79966ab22bec97de43af6a2d3097b'),
('tcf-canada-hzad-01-20261105/l8.mp3','tcf-canada','tcf-canada-hzad-01-20261105',8,'6af33bd0c7de6a38071ebe09fc90329e0e9361839b3403ada7df106496a24f35'),
('tcf-canada-hzad-01-20261105/l9.mp3','tcf-canada','tcf-canada-hzad-01-20261105',9,'6373a0c314e696c944b717835e98a11eff892e952a880d52c9c1f9d29509ada2'),
('tcf-canada-hzad-01-20261105/l10.mp3','tcf-canada','tcf-canada-hzad-01-20261105',10,'7a3f47788be0e3c9f27f05b36c1ffe3e10ee8258dcb727053b913a2b6f1c8b21'),
('tcf-canada-hzad-01-20261105/l11.mp3','tcf-canada','tcf-canada-hzad-01-20261105',11,'d50fa38891d29b6a569090f3f7295ab9688c6ad54d9982e170dac8d257dbc807'),
('tcf-canada-hzad-01-20261105/l12.mp3','tcf-canada','tcf-canada-hzad-01-20261105',12,'4bea3bd523ff8b0262bb4da15eae0e766a2167149eb91342a49a3c0dbe00a873'),
('tcf-canada-hzad-01-20261105/l13.mp3','tcf-canada','tcf-canada-hzad-01-20261105',13,'839037a94923bbcac59c4008fc156842c4d190f7db17e72b8a30b069c21b54d7'),
('tcf-canada-hzad-01-20261105/l14.mp3','tcf-canada','tcf-canada-hzad-01-20261105',14,'45f9917be8b11ddf472389ca10999fad3f3b524fc57b81ae1adb90a9fe1d2e8b'),
('tcf-canada-hzad-01-20261105/l15.mp3','tcf-canada','tcf-canada-hzad-01-20261105',15,'da9d85d81558b6db4860526764f47275c5d5e6becb8912251be87fcdda934490'),
('tcf-canada-hzad-01-20261105/l16.mp3','tcf-canada','tcf-canada-hzad-01-20261105',16,'5c228eaea088f06875996c42d95e2488618518068a3198b320a88545e771f989'),
('tcf-canada-hzad-01-20261105/l17.mp3','tcf-canada','tcf-canada-hzad-01-20261105',17,'cfaf02a45069de7d379524a4fd5dc70537d76620d78e34deb4aba27d73e3ab3a'),
('tcf-canada-hzad-01-20261105/l18.mp3','tcf-canada','tcf-canada-hzad-01-20261105',18,'65553d508456560491645e1bd924c36b0de6cc14348b0422ac288fbc54ec47bf'),
('tcf-canada-hzad-01-20261105/l19.mp3','tcf-canada','tcf-canada-hzad-01-20261105',19,'5c855679743bea5d7a74bf6544459efe96db1d4eb2d678aa93cfc93dc359047a'),
('tcf-canada-hzad-01-20261105/l20.mp3','tcf-canada','tcf-canada-hzad-01-20261105',20,'eda617e9c31113e21f5d405db8945e2ec4bec9cbf0b9f3b6ef2bfde184e225cc'),
('tcf-canada-hzad-01-20261105/l21.mp3','tcf-canada','tcf-canada-hzad-01-20261105',21,'b957c8fb1e75dae6c45128f22c6acbc98a63593037d7962b2ada24df79b5c6fe'),
('tcf-canada-hzad-01-20261105/l22.mp3','tcf-canada','tcf-canada-hzad-01-20261105',22,'42c314458a0039ab70a4c2673cf2a673c05dcc0cd624350712ba225e248e577a'),
('tcf-canada-hzad-01-20261105/l23.mp3','tcf-canada','tcf-canada-hzad-01-20261105',23,'4a92b022e951fcaad7417e11aa1f498111919f24c7090ec027f0ad64084eef67'),
('tcf-canada-hzad-01-20261105/l24.mp3','tcf-canada','tcf-canada-hzad-01-20261105',24,'d45549c10bede1a6e4bce00d56222f761539b945a7e5ab6f405636e1c9aae881'),
('tcf-canada-hzad-01-20261105/l25.mp3','tcf-canada','tcf-canada-hzad-01-20261105',25,'61ce1dbbb5d6ad95b4e8959e2fbd564e9ecdad2e6058f91580a23a0c53e2d380'),
('tcf-canada-hzad-01-20261105/l26.mp3','tcf-canada','tcf-canada-hzad-01-20261105',26,'b73b95b388dea80a35011626852f46b6815f896c42faf714fadc261567b3cd5e'),
('tcf-canada-hzad-01-20261105/l27.mp3','tcf-canada','tcf-canada-hzad-01-20261105',27,'1895126819100598151f5ea314197d8ea473352118393bdc0c103b61a6fc7a61'),
('tcf-canada-hzad-01-20261105/l28.mp3','tcf-canada','tcf-canada-hzad-01-20261105',28,'5abc10f1c5069ec4793efa4be7d9bb1362d9694e72e2dee131e28ffe96c9e30a'),
('tcf-canada-hzad-01-20261105/l29.mp3','tcf-canada','tcf-canada-hzad-01-20261105',29,'53473f387b11313965bf817e1ad99fd714b6be70756eaff7b198c09d639e88ce'),
('tcf-canada-hzad-01-20261105/l30.mp3','tcf-canada','tcf-canada-hzad-01-20261105',30,'b607404e5af69916f973ec9887d7c4132926ee1ad311125c42215754ef231f18'),
('tcf-canada-hzad-01-20261105/l31.mp3','tcf-canada','tcf-canada-hzad-01-20261105',31,'f47a281e3453b27a875a1096694d978314b8a8ee47d197fb6937762a04294e0b'),
('tcf-canada-hzad-01-20261105/l32.mp3','tcf-canada','tcf-canada-hzad-01-20261105',32,'2703886dbad129d95c933b25428c201390bac0dec54de5203affb314019667a7'),
('tcf-canada-hzad-01-20261105/l33.mp3','tcf-canada','tcf-canada-hzad-01-20261105',33,'7f3ad9708850ae7264152cbd861205c1f3cf3e414bedbe10851482284395efbd'),
('tcf-canada-hzad-01-20261105/l34.mp3','tcf-canada','tcf-canada-hzad-01-20261105',34,'f91fedd20bad247a61141f08983928fc9a5d094417ed357cdacafc70364d8d00'),
('tcf-canada-hzad-01-20261105/l35.mp3','tcf-canada','tcf-canada-hzad-01-20261105',35,'9737426e8d9167e6e382b602af4b9d307b5fa48b162be0227151dd3c10bf4fc1'),
('tcf-canada-hzad-01-20261105/l36.mp3','tcf-canada','tcf-canada-hzad-01-20261105',36,'f75735f7080fede946aa102047f32ef400f591d188a5918130c271dc32780e8b'),
('tcf-canada-hzad-01-20261105/l37.mp3','tcf-canada','tcf-canada-hzad-01-20261105',37,'1fc9fa7732679a95ad8dbf23cf028f2a299711afb05a6d44d3642aaabb6ed071'),
('tcf-canada-hzad-01-20261105/l38.mp3','tcf-canada','tcf-canada-hzad-01-20261105',38,'87caadb123cd0eee661fc05ca1103eebd2196c0fbefc453ed647ac4cac9a473b'),
('tcf-canada-hzad-01-20261105/l39.mp3','tcf-canada','tcf-canada-hzad-01-20261105',39,'8512c5f9d34e4d70b13c3431648f716425ce5f3e9145a627725baa6eccb498f0');
notify pgrst,'reload schema';
commit;
