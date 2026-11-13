import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { CATEGORIES } from "@/lib/workCategories";
import { searchManagerData } from "@/lib/managerSearch";
import { findDuplicateProjectName } from "@/lib/mcpProjectWorkflow";
import { buildMaterialPatch } from "@/lib/mcpMaterialWorkflow";
import type { SupabaseClient } from "@supabase/supabase-js";

async function clientFor(request:NextRequest){const token=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");if(!token)return null;const supabase=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{cookies:{getAll:()=>[],setAll:()=>{}},global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});const {data:{user},error}=await supabase.auth.getUser(token);return error||!user?null:{supabase,user};}
export async function GET(request:NextRequest){
  const ctx=await clientFor(request);if(!ctx)return NextResponse.json({error:"unauthorized"},{status:401});
  const q=request.nextUrl.searchParams.get("q")?.trim().toLocaleLowerCase("ru")??"",id=request.nextUrl.searchParams.get("id");
  const [projectsResult,tasksResult,actionsResult,linksResult,documentsResult,materialsResult]=await Promise.all([
    ctx.supabase.from("projects").select("*").eq("user_id",ctx.user.id).order("category").order("sort_order"),
    ctx.supabase.from("tasks").select("*").eq("user_id",ctx.user.id).order("category").order("sort_order"),
    ctx.supabase.from("actions").select("*").eq("user_id",ctx.user.id).order("sort_order"),
    ctx.supabase.from("work_links").select("*").eq("user_id",ctx.user.id),
    ctx.supabase.from("documents").select("id,title,document_type,content_md,site_status,site_locale,site_slug,updated_at").eq("user_id",ctx.user.id),
    ctx.supabase.from("materials").select("id,title,material_type,notes,updated_at,archived_at").eq("user_id",ctx.user.id),
  ]);
  const failed=[projectsResult,tasksResult,actionsResult,linksResult,documentsResult,materialsResult].find(result=>result.error);
  if(failed?.error){console.error("Manager search/read failed:",failed.error.code,failed.error.message);return NextResponse.json({error:"Unable to load manager data"},{status:500});}
  const links=linksResult.data??[];
  const matches=searchManagerData({projects:projectsResult.data??[],tasks:tasksResult.data??[],actions:actionsResult.data??[],documents:documentsResult.data??[],materials:materialsResult.data??[]},q,id);
  return NextResponse.json({...matches,links:links.filter(link=>!id||link.project_id===id||link.task_id===id)});
}
async function createProjectMaterial(supabase:SupabaseClient,userId:string,body:Record<string,unknown>){
  const projectId=typeof body.project_id==="string"?body.project_id:"";
  const title=typeof body.title==="string"?body.title.trim():"";
  const notes=typeof body.notes==="string"?body.notes:"";
  if(!projectId||!title||title.length>500||!notes.trim())return NextResponse.json({error:"project, material title and original content are required"},{status:400});
  const {data:project,error:projectError}=await supabase.from("projects").select("id,name").eq("id",projectId).eq("user_id",userId).maybeSingle();
  if(projectError)return NextResponse.json({error:"Unable to verify project"},{status:500});
  if(!project)return NextResponse.json({error:"project not found"},{status:404});
  const submissionId=typeof body.submission_id==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.submission_id)?body.submission_id:null;
  if(submissionId){const {data:retry,error:retryError}=await supabase.from("materials").select("id,title,material_type,notes,created_at,updated_at,archived_at,submission_id").eq("user_id",userId).eq("submission_id",submissionId).maybeSingle();if(retryError)return NextResponse.json({error:"Unable to read the previous material save"},{status:500});if(retry){const {data:link,error:linkError}=await supabase.from("work_links").select("id,project_id,material_id,created_at").eq("user_id",userId).eq("project_id",projectId).eq("material_id",retry.id).maybeSingle();if(linkError)return NextResponse.json({error:"Unable to verify the previous material link"},{status:500});if(link)return NextResponse.json({data:{project,material:retry,link,write_verification:"read_after_write",already_saved:true}});}}
  const {data:materials,error:materialReadError}=await supabase.from("materials").select("id,title,material_type,notes,created_at,updated_at,archived_at,submission_id").eq("user_id",userId);
  if(materialReadError)return NextResponse.json({error:"Unable to check existing materials"},{status:500});
  const normalizedTitle=title.normalize("NFKC").toLocaleLowerCase("ru").replace(/ё/g,"е").replace(/\s+/g," ").trim();
  const existing=(materials??[]).filter((item)=>item.title.normalize("NFKC").toLocaleLowerCase("ru").replace(/ё/g,"е").replace(/\s+/g," ").trim()===normalizedTitle);
  if(existing.length){
    if(existing.length===1){
      const material=existing[0];
      const {data:link,error:linkError}=await supabase.from("work_links").select("id,project_id,material_id,created_at").eq("user_id",userId).eq("project_id",projectId).eq("material_id",material.id).maybeSingle();
      if(linkError)return NextResponse.json({error:"Unable to verify existing project material"},{status:500});
      if(link&&material.notes===notes&&!material.archived_at)return NextResponse.json({data:{project,material,link,write_verification:"read_after_write",already_saved:true}});
    }
    return NextResponse.json({error:"A material with this title already exists; choose or confirm the existing material before linking it"},{status:409});
  }
  const values={user_id:userId,title,material_type:"other",file_url_or_path:null,notes,...(submissionId?{submission_id:submissionId}:{})};
  const {data:material,error:insertError}=await supabase.from("materials").insert(values).select("id,title,material_type,notes,created_at,updated_at,archived_at,submission_id").single();
  if(insertError)return NextResponse.json({error:insertError.code==="23505"?"A material with this title already exists":insertError.message},{status:insertError.code==="23505"?409:400});
  const {data:link,error:linkInsertError}=await supabase.from("work_links").insert({user_id:userId,project_id:projectId,material_id:material.id}).select("id,project_id,material_id,created_at").single();
  if(linkInsertError){
    await supabase.from("materials").delete().eq("id",material.id).eq("user_id",userId);
    return NextResponse.json({error:linkInsertError.message},{status:400});
  }
  const [{data:savedMaterial,error:savedMaterialError},{data:savedLink,error:savedLinkError}]=await Promise.all([
    supabase.from("materials").select("id,title,material_type,notes,created_at,updated_at").eq("id",material.id).eq("user_id",userId).maybeSingle(),
    supabase.from("work_links").select("id,project_id,material_id,created_at").eq("id",link.id).eq("user_id",userId).eq("project_id",projectId).maybeSingle(),
  ]);
  if(savedMaterialError||savedLinkError||!savedMaterial||!savedLink){
    await supabase.from("work_links").delete().eq("id",link.id).eq("user_id",userId);
    await supabase.from("materials").delete().eq("id",material.id).eq("user_id",userId);
    return NextResponse.json({error:"MediaOS did not confirm the material and project link after saving"},{status:500});
  }
  return NextResponse.json({data:{project,material:savedMaterial,link:savedLink,write_verification:"read_after_write"}});
}
async function createMaterial(supabase:SupabaseClient,userId:string,body:Record<string,unknown>){
  const title=typeof body.title==="string"?body.title.trim():"";const notes=typeof body.notes==="string"?body.notes:"";
  const parents=["project_id","task_id","document_id"].filter(key=>typeof body[key]==="string"&&body[key]);
  if(!title||title.length>500||parents.length>1)return NextResponse.json({error:"a title and at most one project/task/document link are required"},{status:400});
  const submissionId=typeof body.submission_id==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.submission_id)?body.submission_id:null;
  if(submissionId){const {data:retry,error}=await supabase.from("materials").select("*").eq("user_id",userId).eq("submission_id",submissionId).maybeSingle();if(error)return NextResponse.json({error:"Unable to read the previous material save"},{status:500});if(retry)return NextResponse.json({data:{material:retry,already_saved:true}});}
  const normalized=(value:string)=>value.normalize("NFKC").toLocaleLowerCase("ru").replace(/ё/g,"е").replace(/\s+/g," ").trim();
  const {data:existing,error:searchError}=await supabase.from("materials").select("id,title,notes,archived_at").eq("user_id",userId);
  if(searchError)return NextResponse.json({error:"Unable to check existing materials"},{status:500});
  const matches=(existing??[]).filter(row=>normalized(row.title)===normalized(title));
  if(matches.length)return NextResponse.json({error:"A material with this title already exists; read it or confirm a different title before creating another",existing_materials:matches.map(({id,title,archived_at})=>({id,title,archived_at}))},{status:409});
  const {data:material,error:insertError}=await supabase.from("materials").insert({user_id:userId,title,notes:notes||null,material_type:"other",file_url_or_path:null,...(submissionId?{submission_id:submissionId}:{})}).select("*").single();
  if(insertError)return NextResponse.json({error:insertError.message},{status:400});
  const linkKind=parents[0];let link:Record<string,unknown>|null=null;let linkError:unknown=null;
  if(linkKind){const targetId=String(body[linkKind]);const targetTable=linkKind==="project_id"?"projects":linkKind==="task_id"?"tasks":"documents";const {data:target,error}=await supabase.from(targetTable).select("id").eq("id",targetId).eq("user_id",userId).maybeSingle();if(error||!target){await supabase.from("materials").delete().eq("id",material.id).eq("user_id",userId);return NextResponse.json({error:error?.message??"link target not found"},{status:error?500:404});}
    if(linkKind==="document_id"){const {data,error}=await supabase.from("document_materials").insert({user_id:userId,document_id:targetId,material_id:material.id}).select("id,document_id,material_id,created_at").single();link=data;linkError=error;}
    else{const {data,error}=await supabase.from("work_links").insert({user_id:userId,[linkKind]:targetId,material_id:material.id}).select("id,project_id,task_id,material_id,created_at").single();link=data;linkError=error;}}
  if(linkError){await supabase.from("materials").delete().eq("id",material.id).eq("user_id",userId);return NextResponse.json({error:(linkError as {message?:string}).message??"Unable to link material"},{status:400});}
  const {data:saved,error:readError}=await supabase.from("materials").select("*").eq("id",material.id).eq("user_id",userId).maybeSingle();
  if(readError||!saved||saved.title!==title||saved.notes!==(notes||null)){return NextResponse.json({error:"MediaOS did not confirm the material after saving"},{status:500});}
  return NextResponse.json({data:{material:saved,link,write_verification:"read_after_write"}});
}
async function archiveRecord(supabase:SupabaseClient,userId:string,body:Record<string,unknown>,archived:boolean){
  const table=body.kind==="project"?"projects":body.kind==="task"?"tasks":body.kind==="material"?"materials":null;const id=typeof body.id==="string"?body.id:"";
  if(!table||!id)return NextResponse.json({error:"kind and id required"},{status:400});
  const {data,error}=await supabase.from(table).update({archived_at:archived?new Date().toISOString():null}).eq("id",id).eq("user_id",userId).select("*").maybeSingle();
  if(error)return NextResponse.json({error:error.message},{status:400});if(!data)return NextResponse.json({error:"not found"},{status:404});
  return NextResponse.json({data});
}
async function linkMaterial(supabase:SupabaseClient,userId:string,body:Record<string,unknown>){
  const targetKind=body.target_kind;const targetId=typeof body.target_id==="string"?body.target_id:"";const materialId=typeof body.material_id==="string"?body.material_id:"";
  if(!["project","task","document"].includes(String(targetKind))||!targetId||!materialId)return NextResponse.json({error:"target kind, target id and material id are required"},{status:400});
  const table=targetKind==="project"?"projects":targetKind==="task"?"tasks":"documents";
  const [{data:target,error:targetError},{data:material,error:materialError}]=await Promise.all([
    supabase.from(table).select("id").eq("id",targetId).eq("user_id",userId).maybeSingle(),
    supabase.from("materials").select("id").eq("id",materialId).eq("user_id",userId).maybeSingle(),
  ]);
  if(targetError||materialError)return NextResponse.json({error:"Unable to verify link records"},{status:500});if(!target||!material)return NextResponse.json({error:"target or material not found"},{status:404});
  if(targetKind==="document"){
    const {data,error}=await supabase.from("document_materials").insert({user_id:userId,document_id:targetId,material_id:materialId}).select("id,user_id,document_id,material_id,created_at").single();
    if(error&&error.code!=="23505")return NextResponse.json({error:error.message},{status:400});
    const {data:saved,error:readError}=await supabase.from("document_materials").select("id,user_id,document_id,material_id,created_at").eq("user_id",userId).eq("document_id",targetId).eq("material_id",materialId).maybeSingle();
    if(readError||!saved)return NextResponse.json({error:"MediaOS did not confirm the document material link"},{status:500});return NextResponse.json({data:saved});
  }
  const parentColumn=targetKind==="project"?"project_id":"task_id";
  const {data,error}=await supabase.from("work_links").insert({user_id:userId,[parentColumn]:targetId,material_id:materialId}).select("id,user_id,project_id,task_id,material_id,created_at").single();
  if(error&&error.code!=="23505")return NextResponse.json({error:error.message},{status:400});
  const {data:saved,error:readError}=await supabase.from("work_links").select("id,user_id,project_id,task_id,material_id,created_at").eq("user_id",userId).eq(parentColumn,targetId).eq("material_id",materialId).maybeSingle();
  if(readError||!saved)return NextResponse.json({error:"MediaOS did not confirm the material link"},{status:500});return NextResponse.json({data:saved});
}
async function unlinkMaterial(supabase:SupabaseClient,userId:string,body:Record<string,unknown>){
  const table=body.target_kind==="document"?"document_materials":["project","task"].includes(String(body.target_kind))?"work_links":null;const id=typeof body.id==="string"?body.id:"";
  if(!table||!id)return NextResponse.json({error:"valid target_kind and link id required"},{status:400});
  const {data,error}=await supabase.from(table).delete().eq("id",id).eq("user_id",userId).select("id").maybeSingle();
  if(error)return NextResponse.json({error:error.message},{status:400});if(!data)return NextResponse.json({error:"link not found"},{status:404});return NextResponse.json({data:{ok:true,id}});
}
export async function POST(request:NextRequest){const ctx=await clientFor(request);if(!ctx)return NextResponse.json({error:"unauthorized"},{status:401});const body=await request.json().catch(()=>null) as Record<string,unknown>|null;if(!body||typeof body.op!=="string")return NextResponse.json({error:"invalid request"},{status:400});const {supabase,user}=ctx;let result:unknown=null;
  if(body.op==="create_project_material")return createProjectMaterial(supabase,user.id,body);
  if(body.op==="create_material")return createMaterial(supabase,user.id,body);
  if(body.op==="archive")return archiveRecord(supabase,user.id,body,true);
  if(body.op==="restore")return archiveRecord(supabase,user.id,body,false);
  if(body.op==="link_material")return linkMaterial(supabase,user.id,body);
  if(body.op==="unlink_material")return unlinkMaterial(supabase,user.id,body);
  if(body.op==="update_material"){const id=typeof body.id==="string"?body.id:"";if(!id)return NextResponse.json({error:"id required"},{status:400});const {data:current,error:readError}=await supabase.from("materials").select("id,title,notes").eq("id",id).eq("user_id",user.id).maybeSingle();if(readError)return NextResponse.json({error:"Unable to read material"},{status:500});if(!current)return NextResponse.json({error:"material not found"},{status:404});let patch:Record<string,unknown>;try{patch=buildMaterialPatch(current,{...(typeof body.title==="string"?{title:body.title}:{}),...(typeof body.notes==="string"?{notes:body.notes}:{}),...(typeof body.append_text==="string"?{append_text:body.append_text}:{})});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"invalid material update"},{status:400});}const {data,error}=await supabase.from("materials").update(patch).eq("id",id).eq("user_id",user.id).select("*").maybeSingle();if(error)return NextResponse.json({error:error.message},{status:400});if(!data)return NextResponse.json({error:"material not found"},{status:404});return NextResponse.json({data:{...data,previous_notes:current.notes}});}
  if(body.op==="create_project"||body.op==="create_task"||body.op==="create_action"){const title=typeof body.title==="string"?body.title.trim():"";if(!title||title.length>500)return NextResponse.json({error:"title required"},{status:400});const table=body.op==="create_project"?"projects":body.op==="create_task"?"tasks":"actions";const category=table==="projects"?"projects":typeof body.category==="string"&&CATEGORIES.includes(body.category as never)?body.category:"intentions";const submissionId=typeof body.submission_id==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.submission_id)?body.submission_id:null;if(table==="projects"){
    if(submissionId){const {data:retry,error:retryError}=await supabase.from("projects").select("*").eq("user_id",user.id).eq("submission_id",submissionId).maybeSingle();if(retryError)return NextResponse.json({error:retryError.message},{status:400});if(retry)return NextResponse.json({data:retry});}
    const {data:existingProjects,error:existingError}=await supabase.from("projects").select("id,name,submission_id").eq("user_id",user.id);if(existingError)return NextResponse.json({error:existingError.message},{status:400});const duplicate=findDuplicateProjectName(title,existingProjects??[],{submission_id:submissionId});if(duplicate)return NextResponse.json({error:"project already exists",existing_project:{id:duplicate.id,name:duplicate.name}},{status:409});
  }const values:Record<string,unknown>={user_id:user.id,title};if(table==="projects"){values.name=title;delete values.title;values.description=typeof body.description==="string"?body.description:"";values.category="projects";}if(table==="tasks"){values.category=category;values.project_id=typeof body.project_id==="string"?body.project_id:null;values.due_date=typeof body.due_date==="string"?body.due_date:null;values.event_at=typeof body.event_at==="string"?body.event_at:null;values.description=typeof body.description==="string"?body.description:"";values.notes=values.description;if(values.project_id){const {data:parent}=await supabase.from("projects").select("id").eq("id",values.project_id).eq("user_id",user.id).maybeSingle();if(!parent)return NextResponse.json({error:"project not found"},{status:404});}}if(table==="actions"){const taskId=typeof body.task_id==="string"?body.task_id:"";const {data:task}=await supabase.from("tasks").select("id").eq("id",taskId).eq("user_id",user.id).maybeSingle();if(!task)return NextResponse.json({error:"task not found"},{status:404});values.task_id=task.id;values.description=typeof body.description==="string"?body.description:"";values.due_date=typeof body.due_date==="string"?body.due_date:null;values.done=false;}const {data:last}=await supabase.from(table).select("sort_order").eq("user_id",user.id).eq(table==="actions"?"task_id":"category",table==="actions"?String(values.task_id):String(values.category)).order("sort_order",{ascending:false}).limit(1);values.sort_order=(last?.[0]?.sort_order??-1)+1;if(submissionId)values.submission_id=submissionId;let inserted;if(submissionId){const {data,error}=await supabase.from(table).upsert(values,{onConflict:"user_id,submission_id",ignoreDuplicates:true}).select("*").maybeSingle();if(error)return NextResponse.json({error:error.message},{status:400});inserted=data;if(!inserted){const {data:existing,error:lookupError}=await supabase.from(table).select("*").eq("user_id",user.id).eq("submission_id",submissionId).maybeSingle();if(lookupError||!existing)return NextResponse.json({error:lookupError?.message??"idempotent result unavailable"},{status:400});inserted=existing;}}else{const {data,error}=await supabase.from(table).insert(values).select("*").single();if(error)return NextResponse.json({error:error.message},{status:400});inserted=data;}result=inserted;
  }else if(body.op==="update"){const table=body.kind==="project"?"projects":body.kind==="task"?"tasks":body.kind==="action"?"actions":null;const id=typeof body.id==="string"?body.id:"";if(!table||!id)return NextResponse.json({error:"kind and id required"},{status:400});const allowed=table==="projects"?["name","description","category","sort_order"]:table==="tasks"?["title","description","notes","category","sort_order","due_date","event_at","project_id","completed"]:["title","description","sort_order","due_date","done","task_id"];const patch:Record<string,unknown>={};if(table==="projects"&&typeof body.title==="string")patch.name=body.title;for(const key of allowed)if(key in body)patch[key]=body[key];if("category"in patch&&!CATEGORIES.includes(patch.category as never))return NextResponse.json({error:"invalid category"},{status:400});if(table==="projects"&&"category"in patch&&patch.category!=="projects")return NextResponse.json({error:"projects must stay in the projects category"},{status:400});if(table==="tasks"&&typeof patch.project_id==="string"){const {data:parent}=await supabase.from("projects").select("id").eq("id",patch.project_id).eq("user_id",user.id).maybeSingle();if(!parent)return NextResponse.json({error:"project not found"},{status:404});}if((table==="tasks"||table==="actions")&&typeof patch.task_id==="string"){const {data:parent}=await supabase.from("tasks").select("id").eq("id",patch.task_id).eq("user_id",user.id).maybeSingle();if(!parent)return NextResponse.json({error:"task not found"},{status:404});}const {data,error}=await supabase.from(table).update(patch).eq("id",id).eq("user_id",user.id).select("*").maybeSingle();if(error)return NextResponse.json({error:error.message},{status:400});if(!data)return NextResponse.json({error:"not found"},{status:404});result=data;
  }else if(body.op==="reorder"){if(typeof body.category!=="string"||!CATEGORIES.includes(body.category as never)||!Array.isArray(body.items)||body.items.length>500)return NextResponse.json({error:"invalid reorder"},{status:400});if(body.category!=="projects"&&(body.items as {kind?:string}[]).some((item)=>item.kind==="project"))return NextResponse.json({error:"projects cannot be moved out of the projects category"},{status:400});for(let i=0;i<body.items.length;i++){const item=body.items[i] as {kind?:string;id?:string};const table=item.kind==="project"?"projects":item.kind==="task"?"tasks":null;if(!table||typeof item.id!=="string")continue;await supabase.from(table).update({category:table==="projects"?"projects":body.category,sort_order:i}).eq("id",item.id).eq("user_id",user.id);}result={ok:true};
  }else if(body.op==="link"){const parentKind=body.parent_kind==="project"?"project":"task",parentId=typeof body.parent_id==="string"?body.parent_id:"",targetKind=body.target_kind==="document"?"document":"material",targetId=typeof body.target_id==="string"?body.target_id:"";if(!parentId||!targetId||!["project","task"].includes(String(body.parent_kind))||!["document","material"].includes(String(body.target_kind)))return NextResponse.json({error:"invalid link"},{status:400});const [{data:p},{data:t}]=await Promise.all([supabase.from(parentKind==="project"?"projects":"tasks").select("id").eq("id",parentId).eq("user_id",user.id).maybeSingle(),supabase.from(targetKind==="document"?"documents":"materials").select("id").eq("id",targetId).eq("user_id",user.id).maybeSingle()]);if(!p||!t)return NextResponse.json({error:"object not found"},{status:404});const {data,error}=await supabase.from("work_links").insert({user_id:user.id,project_id:parentKind==="project"?parentId:null,task_id:parentKind==="task"?parentId:null,document_id:targetKind==="document"?targetId:null,material_id:targetKind==="material"?targetId:null}).select("*").single();if(error&&error.code!=="23505")return NextResponse.json({error:error.message},{status:400});result=data??{ok:true};
  }else if(body.op==="unlink"){const id=typeof body.id==="string"?body.id:"";if(!id)return NextResponse.json({error:"link id required"},{status:400});const {data,error}=await supabase.from("work_links").delete().eq("id",id).eq("user_id",user.id).select("id").maybeSingle();if(error)return NextResponse.json({error:error.message},{status:400});if(!data)return NextResponse.json({error:"link not found"},{status:404});result={ok:true};
  }else if(body.op==="complete"){const id=typeof body.id==="string"?body.id:"",kind=body.kind==="action"?"action":body.kind==="task"?"task":null;if(!id||!kind)return NextResponse.json({error:"kind and id required"},{status:400});const table=kind==="task"?"tasks":"actions",field=kind==="task"?"completed":"done";if(typeof body.value!=="boolean")return NextResponse.json({error:"boolean value required"},{status:400});const {data,error}=await supabase.from(table).update({[field]:body.value}).eq("id",id).eq("user_id",user.id).select("*").maybeSingle();if(error)return NextResponse.json({error:error.message},{status:400});if(!data)return NextResponse.json({error:"not found"},{status:404});result=data;
  }else return NextResponse.json({error:"unsupported operation"},{status:400});return NextResponse.json({data:result});}
