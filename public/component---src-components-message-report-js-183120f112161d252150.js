(window.webpackJsonp=window.webpackJsonp||[]).push([[1],{b7rG:function(e,t,a){"use strict";a.r(t);a("Z2Ku"),a("L9s1");var l=a("q1tI"),n=a.n(l),r=(a("Wbzz"),a("Fqsg"));t.default=function(e){var t,a,s,m=e.id,c=Object(l.useContext)(r.a),i=c.report,o=(c.secGroups,c.sendReportStatus),u=Object(l.useState)(0),d=u[0],p=u[1],g=Object(l.useState)(25),E=g[0];g[1];Object(l.useEffect)((function(){o(m,0,25)}),[]);var y=new Date(null==i||null===(t=i.broadcast)||void 0===t?void 0:t.when_sent);return n.a.createElement(n.a.Fragment,null,i.broadcast?n.a.createElement(n.a.Fragment,null,n.a.createElement("h3",{style:{},className:"title-report"},i.broadcast.message),n.a.createElement("p",{className:"subtitle-report"},"Sent on "+y.toLocaleDateString()+" at "+y.toLocaleTimeString()+" to "+i.broadcast.target),n.a.createElement("div",{style:{display:"flex",margin:"25px 0"}},n.a.createElement("div",{style:{margin:"0px 15px 0 0"}},n.a.createElement("h2",{className:"summaryVal",style:{margin:0}},Math.max(0,i.broadcast.summary.sent-i.broadcast.summary.failed)),n.a.createElement("p",{className:"summary",style:{margin:0}},"received")),n.a.createElement("div",{style:{margin:"0 15px"}},n.a.createElement("h2",{className:"summaryVal",style:{margin:0}},i.broadcast.summary.pending),n.a.createElement("p",{className:"summary",style:{margin:0}},"pending")),n.a.createElement("div",{style:{margin:"0 15px"}},n.a.createElement("h2",{className:"summaryVal",style:{margin:0}},i.broadcast.summary.failed),n.a.createElement("p",{className:"summary",style:{margin:0}},"failed")),n.a.createElement("div",{style:{margin:"0 15px"}},n.a.createElement("h2",{className:"summaryVal",style:{margin:0}},null===(a=i.broadcast.summary)||void 0===a?void 0:a.ack),n.a.createElement("p",{className:"summary",style:{margin:0}},"acknowledged"))),n.a.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignContent:"center",alignItems:"center"}},n.a.createElement("div",null,n.a.createElement("h2",{className:"report-table-title"},"Report"),n.a.createElement("p",{className:"subtitle-report"},"Lorem Ipsum")),n.a.createElement("button",{className:"downloadButton"},"Download")),n.a.createElement("section",{className:"sentsection",style:{marginTop:"20px",overflow:"scroll"}},n.a.createElement("table",null,n.a.createElement("thead",{bgcolor:"white"},n.a.createElement("tr",null,n.a.createElement("th",{className:"Date"},"Status"),n.a.createElement("th",{className:"tlabel"},"Name"),n.a.createElement("th",{className:"tlabel"},"Message"),n.a.createElement("th",{className:"tlabel"},"Sent"),n.a.createElement("th",{className:"tlabel"},"Read"))),n.a.createElement("tbody",null,null===(s=i.broadcast.report)||void 0===s?void 0:s.map((function(e,t){var a;return 0==e.status?e.status="pending":1==e.status?e.status="sent":2==e.status?e.status="failed":3==e.status?e.status="ack":4==e.status&&(e.status="ignored"),n.a.createElement("tr",{key:t},n.a.createElement("td",null,n.a.createElement("p",{className:"sentmessagereport"},e.status)),n.a.createElement("td",{className:"trowreport"},e.user),(null==e||null===(a=e.status_message)||void 0===a?void 0:a.includes("http"))?n.a.createElement("td",{className:"trowreport"},n.a.createElement("a",{href:e.status_message,rel:"noopener noreferrer",target:"_blank"},"Location")):n.a.createElement("td",{className:"trowreport"},e.status_message),n.a.createElement("td",{className:"trowreport"},n.a.createElement("div",null,n.a.createElement("p",{style:{fontSize:12,fontFamily:"Open Sans",letterSpacing:"0.41px",textAlign:"right",color:"var(--text-light)",lineHeight:1.33}},new Date(e.sent_datetime).toLocaleDateString()),n.a.createElement("p",{style:{fontSize:12,fontFamily:"Open Sans",letterSpacing:"0.41px",textAlign:"right",color:"var(--text-light)",lineHeight:1.33}},new Date(e.sent_datetime).toLocaleTimeString()))),n.a.createElement("td",{className:"trowreport"},n.a.createElement("div",null,n.a.createElement("p",{style:{fontSize:12,fontFamily:"Open Sans",letterSpacing:"0.41px",textAlign:"right",color:"var(--text-light)",lineHeight:1.33}},new Date(e.read_datetime).toLocaleDateString()),n.a.createElement("p",{style:{fontSize:12,fontFamily:"Open Sans",letterSpacing:"0.41px",textAlign:"right",color:"var(--text-light)",lineHeight:1.33}},new Date(e.read_datetime).toLocaleTimeString()))))})))),i.broadcast.report.length>1&&n.a.createElement(n.a.Fragment,null,n.a.createElement("p",{onClick:function(){return function(e,t,a){0!==t&&(p(t-1),o(e,t,a))}(d,E)}},"<"),n.a.createElement("p",null,(0==d?1:d)*E-24,"-",(0==d?1:d)*E),n.a.createElement("p",{onClick:function(){return function(e,t,a){o(e,t,a)}(d,E)}},">")))):"loading")}}}]);
//# sourceMappingURL=component---src-components-message-report-js-183120f112161d252150.js.map