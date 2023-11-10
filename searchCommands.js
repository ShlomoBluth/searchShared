
const path = require('path')

// Cypress.Commands.add('setLanguageMode',(language)=>{
//   cy.get('body').then(elem => {
//     let languageMode
//     if(language=='Hebrew'){
//       languageMode='he'
//     }else if(language=='English'){
//       languageMode=''
//     }
//     let classAttr 
//     if(elem.attr("class").substring(0,2)=='he'){
//       classAttr=elem.attr("class").substring(0,2)
//     }else{
//       classAttr=''
//     }
//     if(Cypress.config("viewportWidth")===1000){
//       cy.clickLanguage('a',classAttr,languageMode,language)
//     }else{
//       cy.clickLanguage('div[class*="lang-switch"]',classAttr,languageMode,language)
//     }
//   })
// })

// Cypress.Commands.add('clickLanguage',(selector,classAttr,languageMode,language)=>{
//   cy.then(()=>{
//     if(classAttr!=languageMode){
//       cy.log('Change to mode '+language)
//       cy.get(selector,{timeout:60000}).contains(/^English$|^עברית$/g,{timeout:60000}).click({force: true});
//     }
//   }).then(()=>{
//     if(languageMode=='he'){
//       cy.get(selector,{timeout:60000}).contains(/^English$/,{timeout:60000}).should('exist')
//     } else{
//       cy.get(selector,{timeout:60000}).contains(/^עברית$/,{timeout:60000}).should('exist')
//     }
//   })
// })

Cypress.Commands.add('searchRunforReq',({text,language,delay})=>{
  cy.setLanguageMode({
    language:language,
    mobileSelector:'lang-switch'
  })
  cy.log("Run search for "+text)
  cy.get('input[id="search_box"]').clear().type(text)
  cy.get('button[id="mobile_search_button"]').click({force:true})
  if(delay!=true){
    cy.get('[class*="loader"]').should('not.exist')
  }
})
  
  
Cypress.Commands.add('searchRun',({text,language,collection})=>{
  cy.setLanguageMode({
    language:language,
    mobileSelector:'lang-switch'
  })
  cy.log("Run search for "+text)
  cy.nameReq('search')
  cy.get('input[id="search_box"]').clear().type(text)
  cy.get('button[id="mobile_search_button"]').click({force:true})
  cy.waitForReq({collection: collection, trigger:'search'})
  cy.sortedByRelevance(collection)
})

Cypress.Commands.add('nameReq',(trigger)=>{
  cy.intercept('**/wordforms').as('wordforms'+trigger)
  cy.intercept('**/textAnalysis').as('textAnalysis'+trigger)
  cy.intercept('**/related').as('related'+trigger)
  cy.intercept('**/search').as('search'+trigger)
  cy.intercept('**/books').as('books'+trigger)
  cy.intercept('**/lexemes').as('lexemes'+trigger)
})

Cypress.Commands.add('sortedByRelevance',(collection)=>{
  let sortStr=''
  cy.nameReq('sort')
  cy.document().its('body').find('#app').then(body=>{
    if(body.find('p[class*="sort-drop-text"]').length>0){
      cy.get('[class*="sort-drop-text"]').children('span').then(sort=>{
        sortStr=sort.text()
      })
      cy.get('p[class*="sort-drop-text"]').children('span').click({force:true})
      cy.get('div[class="drop-down-sort"]').should('exist')
      cy.get(':nth-child(2) > .sort-link').contains(/relevance|רלוונטיות/g).click({force:true})
      cy.get('p[class*="sort-drop-text"]').children('span')
      .contains(/relevance|רלוונטיות/g).should('exist').then(()=>{
        cy.get('[class*="sort-drop-text"]').children('span').then(sort=>{
          if(!sortStr.includes(sort.text())){
            cy.waitForReq({collection: collection, trigger:'search'})
          }
        })
      })
      cy.get('div[class*="relevance-wrap"]').should('not.exist')
      cy.get('ul[class*="result-list"]').should('exist')
    }
  })
})

Cypress.Commands.add('waitForReq',({collection,trigger})=>{
  cy.wait('@wordforms'+trigger,{timeout:300000})
  cy.wait('@textAnalysis'+trigger,{timeout:300000})
  cy.wait('@search'+trigger,{timeout:300000})
  cy.wait('@books'+trigger,{timeout:300000})
  if(collection=='תנ"ך'){
    cy.wait('@lexemes'+trigger,{timeout:300000})
    cy.wait('@related'+trigger,{timeout:300000})
  }
})
  
Cypress.Commands.add('clearInput',()=>{
  cy.get('input[class*="search-form-control"]').clear({force:true})
  cy.get('[class*="fa-search text"]').click({force:true})
})

Cypress.Commands.add('resultList',(tests,data,textNumbers)=>{
  let res=[]
  //Number of result in the page
  cy.get('.result-list>li').then(list=>{
    res.push(list.length)
  })
  //Each result in the page
  cy.get('.result-list > li').each(result=>{
    if(tests=='wordForms'){
      cy.resultContainsWordsForm(data,result)
    }else if(tests=='wordFormsConsecutive'){
      cy.resultContainsConsecutiveWordsForm(data,result) 
    }
    else if(tests=='specific search'){
      cy.resultContainsSpecificWord(data,result)
    }else if(tests=='books'){
      cy.resultFromBooks(data,result)
    }
    else if(tests='selectedMeaningsAndSynonyms'){
      cy.ResultsOfSelectedMeaningsAndSynonyms(result,data)
    }
  }).then(()=>{
    res.push(textNumbers)
  }).then(()=>{
    return res
  })
})
  
Cypress.Commands.add('resultPagination',({tests='',data,textNumbers})=>{
  let numberOfPages
  let numOfResults=0
  cy.lastPage().then(lastPage=>{
    numberOfPages=lastPage
  }).then(()=>{
    cy.resultList(tests,data,textNumbers).then(res=>{
      numOfResults=numOfResults+res[0]
      textNumbers=res[1]
    }).then(()=>{
       //Loop through each page
      for(let i=2;i<=numberOfPages;i++){    
        cy.get('ul[class="pagination"] > li').last().children('button').click({force: true})
        cy.resultList(tests,data,textNumbers).then(res=>{
          numOfResults=numOfResults+res[0]
          textNumbers=res[1]
        })
      }
    })
  }).then(()=>{
    if(tests=='books'){
      //Each book appears as the number of times it has been written next to book
      for (let [key, value] of data) {
        expect(value).eq(0)
      }
    }
    if(textNumbers!==undefined){
      expect(textNumbers).eq(numOfResults)
    }
    //The number of results is equal to the number in the top
    cy.get('.f > span > :nth-child(2)').should('contain',numOfResults)
  })
})

Cypress.Commands.add('lastPage',()=>{
  cy.get('[class*="pagination__item"]',{timeout:60000}).last().then($lastPage=>{
    return parseInt($lastPage.text())
  })
})

Cypress.Commands.add('loaderNotExist',()=>{
  cy.document().its('body').find('#app').within(()=>{
    cy.get('[class*="loader"]').should('not.exist')
  })
})
  
Cypress.Commands.add('nomberOfResults',()=>{
  let number
  cy.document().its('body').find('#app').within($body=>{
    cy.loaderNotExist().then(()=>{
      if($body.find('.result-list').length>0){
        //Results number in the top 
        cy.get('.f > span > :nth-child(2)').then(num=>{
          number=num.text().substring(2,num.text().length-2)
        })
      }else{
        number=0
      }
    })
  }).then(()=>{
    return number
  })
})

Cypress.Commands.add('getTextNumbers',()=>{
  let textNumbers
  cy.get('[class="text-numbers"]').then($textNumbers=>{
    cy.get($textNumbers).should('not.contain','()').then(()=>{
      textNumbers=parseInt($textNumbers.text().substring(1,$textNumbers.text().length-1))
    })
  }).then(()=>{
    return textNumbers
  })
})

Cypress.Commands.add('navigateToStartPage',(startPageUrl)=>{
  function firstPage(){
    return cy.url().then(url=>{
      if(url!==startPageUrl){
        cy.go(-1)
        return firstPage()
      }else{
        cy.url().should('eq',startPageUrl)
      }
    })
  }
  firstPage()
})

Cypress.Commands.add('resultContainsSpecificWord',(word,result)=>{
  let wordInResults
  let hasSpecificWord=false
  cy.get(result).within(()=>{
    //Each bold word in result
    cy.get('b').each($b=>{
      if($b.text().charAt(0)=='['||$b.text().charAt(0)=='('){
        wordInResults=$b.text().substring(1,$b.text().length-1)
      }else if($b.text().charAt($b.text().length)=='־'||
      $b.text().charAt($b.text().length)=='-'){
        wordInResults=$b.text().substring(0,$b.text().length-1)
      }else if($b.text().charAt(0)=='־'||$b.text().charAt(0)=='-'){
        wordInResults=$b.text().substring(1)
      }else{
        wordInResults=$b.text().trim()
      }
      //If found a bold word in result of the specific Word
      if(word==wordInResults){
        hasSpecificWord=true
      }
    }).then(()=>{
      //cy.log(wordInResults)
      expect(hasSpecificWord).to.be.true
    })
  })
})

Cypress.Commands.add('existsInResult',(text)=>{
  let sourceTextWordForms=[]
  cy.showAllWordForms()
  cy.eachSelectedWordFormMatrix().then(eachSelectedWordFormMatrix=>{
    sourceTextWordForms.push(text)
    for(let i=0;i<eachSelectedWordFormMatrix.length;i++){
      if(eachSelectedWordFormMatrix[i].find(x=>x===text)){
        //All wordforms of of word
        sourceTextWordForms=eachSelectedWordFormMatrix[i]
      }
    }
  }).then(()=>{
    //Recursive function through pages
    function existsInResults(text,sourceTextWordForms){
      return cy.existsInPageResult(text,sourceTextWordForms).then($exists=>{
        if($exists==true){
          return true
        }else{
          cy.get('[class*="pagination__navigation"]').last().then($lastPage=>{
            //If last page
            if($lastPage.attr('class').includes('disabled')){
              cy.get($exists).should('be.true') //expect($exists).to.be.true
            }else{
              //Next page
              cy.get('[class*="pagination__navigation"]').last().click({force: true})
              return existsInResults(text,sourceTextWordForms)
            }
          })
        }
      })
    }
    existsInResults(text,sourceTextWordForms)
  })
})
  
Cypress.Commands.add('existsInPageResult',(ALittleDifferentText,sourceTextWordForms)=>{
  let exists=false
  //Each result
  cy.get('.result-list > li').then($li=>{
    function existsInPageResult(pageResult){
      if(pageResult.length==0){
        return exists
      }
      cy.existsResult(pageResult[0],ALittleDifferentText,sourceTextWordForms).then($existsResult=>{
        if($existsResult){
          exists=true
        }
        else{
          existsInPageResult(pageResult.slice(1))
        }
      })
    }
    existsInPageResult($li)
    // for(let i=0;i<sourceTextWordForms.length;i++){
    //   if($li.text().includes(sourceTextWordForms[i])&&sourceTextWordForms[i]!=ALittleDifferentText){
    //     cy.get($li).find('b').then($b=>{
    //       cy.log($b.length).pause()
    //       // if($b==sourceTextWordForms[i]){
    //       //   cy.log($li.text())
    //       //   cy.log(sourceTextWordForms[i]+' false')
    //       //   exists=false
    //       //   return false
    //       // }
    //     })
    //   }else if($li.text().includes(sourceTextWordForms[i])){
    //     cy.log($li.text())
    //     cy.log(sourceTextWordForms[i]+' true')
    //     exists=true
    //   }
    // }
    // if(exists==true){
    //   return false
    // }
    // if(li.text().includes(ALittleDifferentText)&&!li.text().includes(sourceText)){
    //   exists=true
    //   return false
    // }
    // cy.get(li).within(()=>{
    //   //Each bold word in result
    //   cy.get('b').each($b=>{
    //     //If found text
    //     if($b.text()==ALittleDifferentText){
    //       exists=true
    //     }else if($b.text()==sourceText){
    //       exists=false
    //       return false
    //     }
    //   })
    // })
  }).then(()=>{
    return exists
  })
})

Cypress.Commands.add('existsResult',(result,ALittleDifferentText,sourceTextWordForms)=>{
  let exists=false
  cy.get(result).find('b').then($b=>{
    function existsResult(boldWords){
      if(boldWords.length==0){
        return exists
      }
      if(sourceTextWordForms.find(x=>x===boldWords[0].textContent)&&
      boldWords[0].textContent!=ALittleDifferentText){
        exists=false
      }else if(sourceTextWordForms.find(x=>x===boldWords[0].textContent)){
        exists=true
        existsResult(boldWords.slice(1))
      }else{
        existsResult(boldWords.slice(1))
      }
    }
    existsResult($b)
  }).then(()=>{
    return exists
  })
})

Cypress.Commands.add('theFormOfTheText',(form)=>{
  cy.log("Form of text is "+form)
  cy.get('[title="עם ניקוד"]').click({force: true})
  // cy.get('[title="עם ניקוד"]')
  // .should('have.attr','class','btn top-filter-common-btn text-select-btn has-tooltip active')
})
  
Cypress.Commands.add('fontSize',()=>{
  cy.get('[class="reset-line-height"]').then(text=>{
    return parseInt(text.css('font-size'))
  })
})

Cypress.Commands.add('numberOfResultInPage',(number)=>{
  cy.get('[class*="page-toggle"]').click({force: true})
      cy.get('[class="check-text"]').contains(number).siblings().within(()=>{
          cy.get('[type="radio"]').check({force: true})
      })
})

Cypress.Commands.add('removeDownloadsFiles',()=>{
  cy.exec('npx rimraf cypress/downloads/*')
})

Cypress.Commands.add('downloadFile',({type,shemotKdoshim})=>{
  cy.get('[class*="dropdown-toggle"]').contains('הורדת קובץ תוצאות').click({force: true})
  // cy.url().then(url=>{
  //   if(url.includes('https://merge--cranky-banach-377068.netlify.app/')){
  //     cy.get('[class*="dropdown-toggle"]').contains('הורדת קובץ תוצאות').click({force: true})
  //   }else{
  //     cy.get('[class*="dropdown-toggle"]').contains('הורדה').click({force: true})
  //   }
  // })
  
    cy.get('p').contains('קובץ '+type).parent().within(()=>{
      cy.get('[type="radio"]').check({force:true})
    }).then(()=>{
      if(shemotKdoshim===true){
        cy.get('p').contains('לא לכלול שמות קדושים').siblings('[class*="chek"]').within(()=>{
          cy.get('[type="checkbox"]').check({force:true})
        })
      }
    })
  cy.get('[type="submit"]').click({force: true})
})
  
let downloadsFolder = Cypress.config('downloadsFolder')

Cypress.Commands.add('validateFile',({type,resNum,collection})=>{
  const filename = path.join(downloadsFolder, 'searchResults.'+type)
  let count
  
  cy.readFile(filename,{timeout:60000}).should('not.be.null').and('not.eq','').then(text=>{
    //cy.wrap(text).should('not.be.null')
    if(collection==='תלמוד'){
      count=(text.match(/בבלי ומשנה/g)).length
    }else if(collection==='תנ"ך'){
      count=(text.match(/תנ"ך\//g)||text.match(/תנ""ך\//g)).length
    }
  }).then(()=>{
    cy.wrap(count).should('eq',resNum)
  })
})

Cypress.Commands.add('fileDoesNotContain',({type,text})=>{
  const filename = path.join(downloadsFolder, 'searchResults.'+type)
  cy.readFile(filename,{timeout:60000}).then(fileText=>{
    cy.wrap(fileText.includes(text)).should('be.false')
  })
})

Cypress.Commands.add('resultListExist',(isExist)=>{
  cy.document().its('body').find('#app').within(()=>{
      cy.get('[class*="loader"]').should('not.exist')
      cy.get('.result-list').should(isExist)
  })    
})