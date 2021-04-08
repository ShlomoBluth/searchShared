Cypress.Commands.add('showAllWordForms',()=>{
    cy.get('[id="word_forms"] > span').click({force:true})
    //Each word in search
    cy.get('[class="inner-accordion"] > li').each($accordionLi=>{
        cy.get($accordionLi).then(()=>{
            //More than 1 word in search
            if($accordionLi.find('[class="inner-accordion-link"]').length>0){
                //Open the list of word form of a word
                cy.get($accordionLi).within(()=>{
                    cy.get('[class="inner-accordion-link"]').click({force:true})
                    cy.get('[class*="inner-accordion-link"]')
                    .should('have.attr','class','inner-accordion-link selected')
                })
            }
        }).then(()=>{
            //More word form
            if($accordionLi.find('.morebtn').length>0){
                cy.get($accordionLi).within(()=>{
                    cy.get('a[class="f gray"]').click({force:true})
                })
            }
        })
    })
})

Cypress.Commands.add('eachSelectedWordFormMatrix',()=>{
    let wordFormsMatrix=[]
    //Each word in the search
    cy.get('[class="inner-accordion-li inner-li"]').each($searchWord=>{
        cy.get($searchWord).within(()=>{
            cy.selectedWordFormArr().then(wordFormsArr=>{
                wordFormsMatrix.push(wordFormsArr)
            })
        })
    }).then(()=>{
        return wordFormsMatrix
    })
})

Cypress.Commands.add('selectedWordFormArr',()=>{
    let wordFormsArr=[]
    //Each word form 
    cy.get('[class="slide-li"]').each($wordForm=>{
        if($wordForm.text().includes('(0)')){
            return false
        }
        cy.get($wordForm).within(()=>{
            //The number of results that contain the word form
            cy.getTextNumbers().then(textMumbers=>{
                if(textMumbers!=0){
                    cy.get('[type="checkbox"]').then($checkbox=>{
                        //if selected
                        if($checkbox.prop('checked')){
                            cy.getWordform().then(word=>{
                                wordFormsArr.push(word)
                            })
                        }
                    })
                }
            })
        })
    }).then(()=>{
        return wordFormsArr
    })
})

Cypress.Commands.add('wordFormsWithNumberOfAppearances',()=>{
    //Each word in search
    cy.get('[class="inner-accordion"] > li').each($searchWord=>{
        cy.get($searchWord).within(()=>{
            //More than 1 word form
            if($searchWord.find('[class*="selectAll"]').length>0){
                cy.get('p').contains(/^Select All$|^בחר הכל$/g)
                .siblings('[class="chek-box-holder"]').within(()=>{
                    cy.get('[type="checkbox"]').uncheck({force:true})
                })
            }
        }).then(()=>{
            cy.get($searchWord).within(()=>{
                //Each word form
                cy.get('[class="slide-li"]').each($wordForm=>{
                    cy.get($wordForm).within(()=>{
                        //The number of results that contain the word form
                        cy.getTextNumbers().then($textNum=>{
                            if($textNum==0){
                                return false
                            }else{
                                cy.document().its('body').find('#app').within(()=>{
                                    cy.get('[class*="loader"]').should('not.exist')
                                    cy.get('.result-list').should('not.exist')
                                })
                                cy.get('[type="checkbox"]').check({force: true})
                                cy.document().its('body').find('#app').within(()=>{
                                    cy.get('[class*="loader"]').should('not.exist')
                                    cy.eachSelectedWordFormMatrix().
                                    then(selectedWordFormMatrix=>{
                                        cy.resultPagination({
                                            tests:'wordForms',
                                            data:selectedWordFormMatrix,
                                            textNumbers:$textNum
                                        })
                                    })
                                })
                                cy.get('[type="checkbox"]').uncheck({force: true})
                            }
                        })
                    })
                })
            })
        }).then(()=>{
            cy.get($searchWord).within(()=>{
                //More than 1 word form
                if($searchWord.find('[class*="selectAll"]').length>0){
                    cy.get('p').contains(/^Select All$|^בחר הכל$/g)
                    .siblings('[class="chek-box-holder"]').within(()=>{
                        cy.get('[type="checkbox"]').check({force:true})
                        cy.document().its('body').find('#app').within(()=>{
                            cy.get('[class*="loader"]').should('not.exist')
                            cy.get('.result-list').should('exist')
                        })
                    })
                }
            })
        })
    })
})

Cypress.Commands.add('consecutiveWordsFormsArray',()=>{
    let temp
    let consecutiveWordFormsArray
    //All selected words form
    cy.eachSelectedWordFormMatrix().then(wordFormsArray=>{
      temp=wordFormsArray[0]
      //Loop through words in the search
      for(let i=1;i<wordFormsArray.length;i++){
        consecutiveWordFormsArray=[] 
        //Loop through selected words form of evry word in the search
        for (let j=0;j<wordFormsArray[i].length;j++){
          //Add all words forms  
          for(let k=0;k<temp.length;k++){ 
            consecutiveWordFormsArray.push(temp[k]+' '
            +wordFormsArray[i][j])
          }
        }
        temp=consecutiveWordFormsArray
      }
    }).then(()=>{
      return consecutiveWordFormsArray
    })
})

Cypress.Commands.add('resultContainsConsecutiveWordsForm',(wordFormsArray,result)=>{
    let hasWordForm=false
    for(let i=0;i<wordFormsArray.length;i++){
        if(result.text().includes(wordFormsArray[i])){
            hasWordForm=true
            break  
        }
    }
    cy.wrap(hasWordForm).should('eq',true)
})

Cypress.Commands.add('resultContainsWordsForm',(wordFormsArray,result)=>{
    let boldWordsList=[]
    cy.get(result).within(()=>{
        //Each bold word in result
        cy.get('b').each($b=>{
            if($b.text().charAt(0)=='['||$b.text().charAt(0)=='('){
                boldWordsList.push($b.text().substring(1,$b.text().length-1))
            }else if($b.text().charAt($b.text().length)=='־'||
            $b.text().charAt($b.text().length)=='-'){
                boldWordsList.push($b.text().substring(0,$b.text().length-1))
            }else if($b.text().charAt(0)=='־'||$b.text().charAt(0)=='-'){
                boldWordsList.push($b.text().substring(1))
            }
            else{
                boldWordsList.push($b.text().trim())
            }
        })
    }).then(()=>{
        let hasWordForm=false
        //Loop through words form
        for(let i=0;i<wordFormsArray.length;i++){
            hasWordForm=false
            for (let j=0;j<wordFormsArray[i].length;j++){
                let wordForm=boldWordsList.find(x=>x===wordFormsArray[i][j])
                //If the word form was found in the list of bold words in the result
                if(wordForm==wordFormsArray[i][j]){
                    expect(wordForm).eq(wordFormsArray[i][j])
                    hasWordForm=true
                    break  
                }
            }
            cy.wrap(hasWordForm).should('be.true')
        }
    })
})

Cypress.Commands.add('getWordform',()=>{
    cy.get('[class="f-narkis"]').then(text=>{
        return text.text()
    })
})
  