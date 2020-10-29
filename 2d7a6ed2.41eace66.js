(window.webpackJsonp=window.webpackJsonp||[]).push([[5],{60:function(e,t,n){"use strict";n.r(t),n.d(t,"frontMatter",(function(){return i})),n.d(t,"metadata",(function(){return l})),n.d(t,"rightToc",(function(){return c})),n.d(t,"default",(function(){return b}));var r=n(2),a=n(6),u=(n(0),n(70)),i={},l={unversionedId:"Revenue",id:"Revenue",isDocsHomePage:!1,title:"Revenue",description:"Revenue()",source:"@site/docs/Revenue.md",permalink:"/dave-JavaScript/Revenue",editUrl:"https://github.com/datadive-ai/dave-JavaScript/website/docs/Revenue.md",sidebar:"sidebar",previous:{title:"Identify",permalink:"/dave-JavaScript/Identify"}},c=[{value:"<code>Revenue()</code>",id:"revenue",children:[]},{value:"<code>Revenue#setProductId</code>",id:"revenuesetproductid",children:[{value:"Parameters",id:"parameters",children:[]},{value:"Return Value",id:"return-value",children:[]}]},{value:"<code>Revenue#setQuantity</code>",id:"revenuesetquantity",children:[{value:"Parameters",id:"parameters-1",children:[]},{value:"Return Value",id:"return-value-1",children:[]}]},{value:"<code>Revenue#setPrice</code>",id:"revenuesetprice",children:[{value:"Parameters",id:"parameters-2",children:[]},{value:"Return Value",id:"return-value-2",children:[]}]},{value:"<code>Revenue#setRevenueType</code>",id:"revenuesetrevenuetype",children:[{value:"Parameters",id:"parameters-3",children:[]},{value:"Return Value",id:"return-value-3",children:[]}]},{value:"<code>Revenue#setEventProperties</code>",id:"revenueseteventproperties",children:[{value:"Parameters",id:"parameters-4",children:[]},{value:"Return Value",id:"return-value-4",children:[]}]}],d={rightToc:c};function b(e){var t=e.components,n=Object(a.a)(e,["components"]);return Object(u.b)("wrapper",Object(r.a)({},d,n,{components:t,mdxType:"MDXLayout"}),Object(u.b)("h2",{id:"revenue"},Object(u.b)("inlineCode",{parentName:"h2"},"Revenue()")),Object(u.b)("pre",null,Object(u.b)("code",Object(r.a)({parentName:"pre"},{}),"var revenue = new datadive.Revenue();\n")),Object(u.b)("p",null,"Revenue API - instance constructor. Wrapper for logging Revenue data. Revenue objects get passed to datadive.logRevenueV2 to send to Datadive servers.\nEach method updates a revenue property in the Revenue object, and returns the same Revenue object,\nallowing you to chain multiple method calls together."),Object(u.b)("p",null,"Note: price is a required field to log revenue events.\nIf quantity is not specified then defaults to 1."),Object(u.b)("h2",{id:"revenuesetproductid"},Object(u.b)("inlineCode",{parentName:"h2"},"Revenue#setProductId")),Object(u.b)("pre",null,Object(u.b)("code",Object(r.a)({parentName:"pre"},{}),"var revenue = new datadive.Revenue().setProductId('productIdentifier').setPrice(10.99);\ndatadive.logRevenueV2(revenue);\n")),Object(u.b)("p",null,"Set a value for the product identifer."),Object(u.b)("h3",{id:"parameters"},"Parameters"),Object(u.b)("ul",null,Object(u.b)("li",{parentName:"ul"},Object(u.b)("inlineCode",{parentName:"li"},"productId")," (",Object(u.b)("inlineCode",{parentName:"li"},"string"),")\nThe value for the product identifier. Empty and invalid strings are ignored.")),Object(u.b)("h3",{id:"return-value"},"Return Value"),Object(u.b)("ul",null,Object(u.b)("li",{parentName:"ul"},"(",Object(u.b)("inlineCode",{parentName:"li"},"Revenue"),")\nReturns the same Revenue object, allowing you to chain multiple method calls together.")),Object(u.b)("h2",{id:"revenuesetquantity"},Object(u.b)("inlineCode",{parentName:"h2"},"Revenue#setQuantity")),Object(u.b)("pre",null,Object(u.b)("code",Object(r.a)({parentName:"pre"},{}),"var revenue = new datadive.Revenue().setProductId('productIdentifier').setPrice(10.99).setQuantity(5);\ndatadive.logRevenueV2(revenue);\n")),Object(u.b)("p",null,"Set a value for the quantity. Note revenue amount is calculated as price ","*"," quantity."),Object(u.b)("h3",{id:"parameters-1"},"Parameters"),Object(u.b)("ul",null,Object(u.b)("li",{parentName:"ul"},Object(u.b)("inlineCode",{parentName:"li"},"quantity")," (",Object(u.b)("inlineCode",{parentName:"li"},"number"),")\nInteger value for the quantity. If not set, quantity defaults to 1.")),Object(u.b)("h3",{id:"return-value-1"},"Return Value"),Object(u.b)("ul",null,Object(u.b)("li",{parentName:"ul"},"(",Object(u.b)("inlineCode",{parentName:"li"},"Revenue"),")\nReturns the same Revenue object, allowing you to chain multiple method calls together.")),Object(u.b)("h2",{id:"revenuesetprice"},Object(u.b)("inlineCode",{parentName:"h2"},"Revenue#setPrice")),Object(u.b)("pre",null,Object(u.b)("code",Object(r.a)({parentName:"pre"},{}),"var revenue = new datadive.Revenue().setProductId('productIdentifier').setPrice(10.99);\ndatadive.logRevenueV2(revenue);\n")),Object(u.b)("p",null,"Set a value for the price. This field is required for all revenue being logged."),Object(u.b)("p",null,"Note: revenue amount is calculated as price ","*"," quantity."),Object(u.b)("h3",{id:"parameters-2"},"Parameters"),Object(u.b)("ul",null,Object(u.b)("li",{parentName:"ul"},Object(u.b)("inlineCode",{parentName:"li"},"price")," (",Object(u.b)("inlineCode",{parentName:"li"},"number"),")\nDouble value for the quantity.")),Object(u.b)("h3",{id:"return-value-2"},"Return Value"),Object(u.b)("ul",null,Object(u.b)("li",{parentName:"ul"},"(",Object(u.b)("inlineCode",{parentName:"li"},"Revenue"),")\nReturns the same Revenue object, allowing you to chain multiple method calls together.")),Object(u.b)("h2",{id:"revenuesetrevenuetype"},Object(u.b)("inlineCode",{parentName:"h2"},"Revenue#setRevenueType")),Object(u.b)("pre",null,Object(u.b)("code",Object(r.a)({parentName:"pre"},{}),"var revenue = new datadive.Revenue().setProductId('productIdentifier').setPrice(10.99).setRevenueType('purchase');\ndatadive.logRevenueV2(revenue);\n")),Object(u.b)("p",null,"Set a value for the revenueType (for example purchase, cost, tax, refund, etc)."),Object(u.b)("h3",{id:"parameters-3"},"Parameters"),Object(u.b)("ul",null,Object(u.b)("li",{parentName:"ul"},Object(u.b)("inlineCode",{parentName:"li"},"revenueType")," (",Object(u.b)("inlineCode",{parentName:"li"},"string"),")\nRevenueType to designate.")),Object(u.b)("h3",{id:"return-value-3"},"Return Value"),Object(u.b)("ul",null,Object(u.b)("li",{parentName:"ul"},"(",Object(u.b)("inlineCode",{parentName:"li"},"Revenue"),")\nReturns the same Revenue object, allowing you to chain multiple method calls together.")),Object(u.b)("h2",{id:"revenueseteventproperties"},Object(u.b)("inlineCode",{parentName:"h2"},"Revenue#setEventProperties")),Object(u.b)("pre",null,Object(u.b)("code",Object(r.a)({parentName:"pre"},{}),"var event_properties = {'city': 'San Francisco'};\nvar revenue = new datadive.Revenue().setProductId('productIdentifier').setPrice(10.99).setEventProperties(event_properties);\ndatadive.logRevenueV2(revenue);\n")),Object(u.b)("p",null,"Set event properties for the revenue event."),Object(u.b)("h3",{id:"parameters-4"},"Parameters"),Object(u.b)("ul",null,Object(u.b)("li",{parentName:"ul"},Object(u.b)("inlineCode",{parentName:"li"},"eventProperties")," (",Object(u.b)("inlineCode",{parentName:"li"},"object"),")\nRevenue event properties to set.")),Object(u.b)("h3",{id:"return-value-4"},"Return Value"),Object(u.b)("ul",null,Object(u.b)("li",{parentName:"ul"},"(",Object(u.b)("inlineCode",{parentName:"li"},"Revenue"),")\nReturns the same Revenue object, allowing you to chain multiple method calls together.")))}b.isMDXComponent=!0}}]);