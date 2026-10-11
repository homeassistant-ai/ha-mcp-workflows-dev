import { readFileSync, mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';

const manifest = JSON.parse(readFileSync('fixtures/pr-interactions/manifest.json', 'utf8'));
const repository = 'homeassistant-ai/ha-mcp-workflows-dev';
if (process.env.GITHUB_REPOSITORY !== repository || manifest.repository !== repository)
  throw Error('This probe is limited to the workflow-development bench');
if (!Number.isSafeInteger(manifest.fixture_number) || manifest.fixture_number <= 0)
  throw Error('A manifest-pinned synthetic fixture is required');
if (!Number.isFinite(Date.parse(process.env.PROBE_UNTIL)) || Date.now() > Date.parse(process.env.PROBE_UNTIL))
  throw Error('The manually armed probe session has expired');

const token = process.env.GH_TOKEN;
if (!token) throw Error('A step-scoped GitHub token is required');
const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
const eventName = process.env.GITHUB_EVENT_NAME;
const labels = ['Comments only from the bot', 'Allow the bot to push bounded fixes', 'Allow the assigned maintainer to push bounded fixes', "I'm happy with what this change does", 'Run or update assessment'];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function api(path, method='GET', data) {
  const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, {
    method, headers: {'Accept':'application/vnd.github+json','Authorization':`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28'},
    ...(data === undefined ? {} : {body:JSON.stringify(data)}),
  });
  const result = await response.json();
  if (!response.ok) throw Error(`GitHub ${method} ${path}: HTTP ${response.status}; ${result.message || 'request failed'}`);
  return result;
}
async function fixture() {
  const pr=await api(`pulls/${manifest.fixture_number}`);
  if (pr.head.ref!==manifest.branch || !pr.labels.some(label=>label.name===manifest.label) || pr.state!=='open')
    throw Error('The fixture association, label or open state changed');
  return pr;
}
function flags(body) {
  const result={};
  for(const label of labels) {
    const line=(body||'').split(/\r?\n/).find(line=>line.replace(/^- \[[ xX]\] /,'')===label);
    result[label]=!!line&&/^- \[[xX]\] /.test(line);
  }
  return result;
}
function report(name,data) {
  mkdirSync('probe-results',{recursive:true});
  writeFileSync(`probe-results/${name}.json`,JSON.stringify(data,null,2)+'\n');
  const guard=randomUUID();
  console.log(`::stop-commands::${guard}`);
  console.log(JSON.stringify(data,null,2));
  console.log(`::${guard}::`);
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,`## ${name}\n\n\`\`\`json\n${JSON.stringify(data,null,2)}\n\`\`\`\n`);
}
async function editor(comment) {
  const response=await fetch('https://api.github.com/graphql',{
    method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
    body:JSON.stringify({query:'query($id: ID!) { node(id:$id) { ... on IssueComment { lastEditedAt editor { login __typename } } } }',variables:{id:comment.node_id}}),
  });
  const value=await response.json();
  if(!response.ok||value.errors)throw Error('Could not verify the current comment editor');
  return value.data.node;
}
async function capture() {
  const pr=await fixture();
  const comment=event.comment;
  const registered=manifest.control_comments.find(control=>control.id===comment?.id);
  const before=flags(event.changes?.body?.from||'');
  const after=flags(comment?.body||'');
  const sender=event.sender||{};
  let permission=null;
  if(sender.type==='User') {
    try { permission=(await api(`collaborators/${encodeURIComponent(sender.login)}/permission`)).permission; }
    catch { permission='unverified'; }
  }
  const manualAuthorized=eventName==='workflow_dispatch'&&['admin','maintain'].includes(permission);
  const isControl=!!registered&&comment.body.includes(manifest.marker);
  const rising=!!comment&&after[labels[4]]&&!before[labels[4]];
  // The lab permits only its actual PR author to submit a synthetic command.
  const actorVerified=sender.type==='User'&&sender.login===pr.user.login;
  const eligible=isControl&&actorVerified&&rising&&['created','edited'].includes(event.action);
  const observed={
    run_id:process.env.GITHUB_RUN_ID,event:eventName,action:event.action||null,
    sender:sender.login||process.env.GITHUB_ACTOR, sender_type:sender.type||null,
    sender_permission:permission,manual_operation_authorized:manualAuthorized,
    fixture:pr.number,head:pr.head.sha,comment_id:comment?.id||null,
    comment_author:comment?.user?.login||null,comment_author_type:comment?.user?.type||null,
    control_kind:registered?.kind||null,previous_body_present:typeof event.changes?.body?.from==='string',
    previous_flags:before,current_flags:after,
    pr_body: event.pull_request?.body||null,
    request_identifier:event.requested_action?.identifier||null,
    eligible_for_synthetic_consumer:eligible,
    reason:eligible?'Explicit command edge from the fixture author':!isControl?'Not a registered control comment':!actorVerified?'Bot/other actor cannot authorize this request':!rising?'Option/text edit, not a new command edge':'Unsupported event',
  };
  if(comment)observed.current_editor=await editor(await api(`issues/comments/${comment.id}`));
  report('event',observed);
  appendFileSync(process.env.GITHUB_OUTPUT,`eligible=${eligible}\nmanual_authorized=${manualAuthorized}\n`);
}
async function settle() {
  const registered=manifest.control_comments.find(control=>control.id===event.comment?.id);
  if(!registered)throw Error('Unregistered control comment');
  let lastDigest='',quietStart=0,current=null;
  const started=Date.now();
  while(Date.now()-started<90000) {
    current=await api(`issues/comments/${registered.id}`);
    const digest=createHash('sha256').update(current.body).digest('hex');
    if(digest!==lastDigest){lastDigest=digest;quietStart=Date.now();}
    if(Date.now()-quietStart>=30000)break;
    await pause(2000);
  }
  if(Date.now()-quietStart<30000)throw Error('No stable 30-second input window');
  const pr=await fixture();
  const currentEditor=await editor(current);
  const currentFlags=flags(current.body);
  const authenticatedActor=currentEditor.editor?.__typename==='User'&&currentEditor.editor.login===pr.user.login;
  const modes=Number(currentFlags[labels[0]])+Number(currentFlags[labels[1]]);
  const accepted=authenticatedActor&&currentFlags[labels[4]]&&currentFlags[labels[3]]&&modes===1;
  report('stable-input',{
    fixture:pr.number,head:pr.head.sha,comment_id:current.id,control_kind:registered.kind,
    submission_sender:event.sender.login,latest_editor:currentEditor.editor,
    latest_updated_at:current.updated_at,quiet_seconds:Math.floor((Date.now()-quietStart)/1000),
    total_seconds:Math.floor((Date.now()-started)/1000),flags:currentFlags,
    valid_modes:modes===1,synthetic_assessment_reserved:accepted,
    model_calls:0,repository_writes:0,
    note:accepted?'The synthetic consumer would assess the final configuration once. No model or patch was executed.':'No assessment: withdrawn request, missing sign-off, conflicting modes or unverifiable editor.',
  });
}
async function createControl() {
  await fixture();
  const body=`[Agent] **Bot-owned control comment — UI/event probe**\n\n${manifest.marker}\n\nThis is synthetic input. No agent edits code or spends model tokens.\n\n${labels.map((label,index)=>`- [${index===0?'x':' '}] ${label}`).join('\n')}\n\nProbe status: waiting for an explicitly submitted synthetic request.`;
  const comment=await api(`issues/${manifest.fixture_number}/comments`,'POST',{body});
  report('created-control',{id:comment.id,url:comment.html_url,author:comment.user.login,author_type:comment.user.type});
}
async function botStatus() {
  await fixture();
  const registered=manifest.control_comments.find(control=>control.kind==='bot-owned');
  if(!registered)throw Error('No registered bot-owned comment');
  const comment=await api(`issues/comments/${registered.id}`);
  // Preserve choices; this changes only the probe's status text.
  const body=comment.body.replace(/^Probe status:.*$/m,`Probe status: bot-only status update ${new Date().toISOString()}.`);
  const updated=await api(`issues/comments/${registered.id}`,'PATCH',{body});
  report('bot-status-update',{id:updated.id,url:updated.html_url,author:updated.user.login});
}
async function createCheck() {
  const pr=await fixture();
  const check=await api('check-runs','POST',{
    name:'PR controls requested-action probe',head_sha:pr.head.sha,status:'completed',conclusion:'neutral',
    external_id:`pr-controls-${manifest.fixture_number}`,completed_at:new Date().toISOString(),
    output:{title:'Synthetic requested-action test',summary:'[Agent] The button is test-only. No model or product workflow is called.'},
    actions:[{label:'Assess fixture',description:'Test a check action; no model call',identifier:'assess_fixture'}],
  });
  report('created-check',{id:check.id,url:check.html_url,app:check.app.slug,head:check.head_sha,actions:check.actions||[]});
}
const commands={'capture':capture,'settle':settle,'create-control':createControl,'bot-status':botStatus,'create-check':createCheck};
const command=commands[process.argv[2]];
if(!command)throw Error('Unknown probe operation');
await command();
