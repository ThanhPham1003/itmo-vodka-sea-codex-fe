const array=value=>Array.isArray(value)?value:[];

const systemNames={
  CLASSIFICATION_UNCERTAIN:'Xác nhận loại giấy tờ và đối tượng',
  FIELD_NEEDS_VERIFICATION:'Xác minh trường dữ liệu',
  SPECIAL_CHECK:'Kiểm tra yêu cầu đặc biệt'
};
const systemPrefixes={classification:'CLASSIFICATION_UNCERTAIN',field:'FIELD_NEEDS_VERIFICATION',special:'SPECIAL_CHECK'};

export function reconciliationIssues(issues,{configuration={},files=[],groups=[],fields=[]}={}) {
  // Use the dossier snapshot, so later catalog edits cannot rename its rules
  // or change the labels associated with historical evidence.
  const rules=new Map(array(configuration.definition?.rules).map(rule=>[rule.code,rule]));
  const schemas=new Map(array(configuration.documents).map(doc=>[doc.code,doc.definition]));
  const fileById=new Map(array(files).map(file=>[file.id,file]));
  const groupById=new Map(array(groups).map(group=>[group.id,group]));
  const fieldById=new Map(array(fields).map(field=>[field.id,field]));

  function source(evidence,reference) {
    const group=groupById.get(evidence?.document_group_id);
    const field=fieldById.get(evidence?.field_id);
    const file=fileById.get(evidence?.file_id)||fileById.get(group?.file_id)||fileById.get(field?.file_id);
    const original=fileById.get(file?.source_file_id)||file;
    const schema=schemas.get(group?.document_type||reference?.document_type||file?.document_type);
    const fieldKey=evidence?.field_key||reference?.field_key||field?.key;
    const label=array(schema?.fields).find(item=>item.key===fieldKey)?.label||field?.label;
    return {
      label:[schema?.name,label].filter(Boolean).join(' · '),
      // Evidence values are already redacted by the API. Never substitute an
      // extracted-field value or rebuild it while resolving display labels.
      value:evidence?.value??'',fileName:original?.original_name||'',
      page:evidence?.page>0?evidence.page:group?.pages?.length===1?group.pages[0]:undefined
    };
  }

  return array(issues).map(issue=>{
    const rule=rules.get(issue.rule_code);
    const kind=systemNames[issue.code]?issue.code:systemPrefixes[issue.rule_code?.split(':')[0]];
    const singleSource=!rule&&Boolean(kind);
    const evidence=array(issue.evidence);
    const left=source(evidence[0],rule?.left);
    if(singleSource&&!left.value&&!evidence[0]?.field_key)left.value=left.fileName;
    return {...issue,
      name:rule?.name||systemNames[kind]||'Kiểm tra đối soát',nameIsUserContent:Boolean(rule?.name),singleSource,
      left,right:singleSource?null:source(evidence[1],rule?.right)
    };
  });
}
