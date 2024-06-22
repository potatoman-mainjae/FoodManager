document.addEventListener('DOMContentLoaded', function () {
    const foodData = [];

    // 엑셀 파일 로드 및 파싱
    const url = 'food_average.xlsx'; // 업로드한 엑셀 파일의 경로
    fetch(url)
        .then(response => response.arrayBuffer())
        .then(data => {
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            // JSON 데이터를 foodData 배열에 저장
            json.forEach(row => {
                foodData.push(row);
            });
        })
        .catch(error => console.error('Error fetching the Excel file:', error));

    document.getElementById('foodInput').addEventListener('input', function () {
        const query = this.value.toLowerCase();
        const suggestions = getFoodSuggestions(query);
        showSuggestions(suggestions);
    });

    document.getElementById('consumeButton').addEventListener('click', function () {
        consumeFood();
    });

    let selectedFood = null;
    const intake = {
        calories: 0,
        carbs: 0,
        protein: 0,
        fat: 0,
        sugar: 0,
        minerals: 0
    };

    const dailyIntake = {
        calories: 2000,
        carbs: 150, // g
        protein: 60, // g
        fat: 70, // g
        minerals: 1000 // mg
    };

    function getFoodSuggestions(query) {
        return foodData.filter(row => row[0].toLowerCase().includes(query)).slice(0, 24);
    }

    function showSuggestions(suggestions) {
        const suggestionsDiv = document.getElementById('suggestions');
        suggestionsDiv.innerHTML = '';
        suggestions.forEach(suggestion => {
            const suggestionDiv = document.createElement('div');
            suggestionDiv.textContent = suggestion[0];
            suggestionDiv.addEventListener('click', function () {
                displayFoodInfo(suggestion);
            });
            suggestionsDiv.appendChild(suggestionDiv);
        });
    }

    function displayFoodInfo(food) {
        const calories = parseFloat(food[6]);
        const carbs = parseFloat(food[10]);
        const protein = parseFloat(food[8]);
        const fat = parseFloat(food[9]);
        const sugar = parseFloat(food[11]);
        const minerals = parseFloat(food[12]);

        selectedFood = { name: food[0], calories, carbs, protein, fat, sugar, minerals };

        document.getElementById('calories').textContent = `칼로리: ${calories} kcal`;
        document.getElementById('macros').textContent = `탄단지 분배: 탄수화물 ${carbs}g, 단백질 ${protein}g, 지방 ${fat}g`;
        document.getElementById('sugar').textContent = `당: ${sugar}g`;
        document.getElementById('minerals').textContent = `무기질: ${minerals}mg`;
        document.getElementById('consumeButton').disabled = false;
    }

   function consumeFood() {
    if (!selectedFood) return;

    intake.calories += selectedFood.calories;
    intake.carbs += selectedFood.carbs;
    intake.protein += selectedFood.protein;
    intake.fat += selectedFood.fat;
    intake.sugar += selectedFood.sugar;
    intake.minerals += selectedFood.minerals;

    updateIntakeInfo();

    const consumedFoodList = document.getElementById('consumedFoodList');
    const foodItem = document.createElement('li');
    foodItem.textContent = selectedFood.name;

    const deleteButton = document.createElement('button');
    deleteButton.textContent = '삭제';
    deleteButton.addEventListener('click', function () {
        consumedFoodList.removeChild(foodItem);
        subtractFood(selectedFood); // 삭제 시 영양소 빼기
        updateIntakeInfo(); // 정보 업데이트
    });

    foodItem.appendChild(deleteButton);
    consumedFoodList.appendChild(foodItem);

    selectedFood = null;
    document.getElementById('consumeButton').disabled = true;
}


    function updateIntakeInfo() {
        document.getElementById('intakeCalories').textContent = `칼로리: ${intake.calories} kcal`;
        document.getElementById('intakeMacros').textContent = `탄단지 분배: 탄수화물 ${intake.carbs}g, 단백질 ${intake.protein}g, 지방 ${intake.fat}g`;
        document.getElementById('intakeSugar').textContent = `당: ${intake.sugar}g`;
        document.getElementById('intakeMinerals').textContent = `무기질: ${intake.minerals}mg`;

        const carbRatio = (intake.carbs / dailyIntake.carbs) * 100;
        const proteinRatio = (intake.protein / dailyIntake.protein) * 100;
        const fatRatio = (intake.fat / dailyIntake.fat) * 100;

        document.getElementById('carbRatio').textContent = `탄수화물 비율: ${carbRatio.toFixed(2)}%`;
        document.getElementById('proteinRatio').textContent = `단백질 비율: ${proteinRatio.toFixed(2)}%`;
        document.getElementById('fatRatio').textContent = `지방 비율: ${fatRatio.toFixed(2)}%`;

        const warning = document.getElementById('intakeWarning');
        if (intake.calories > dailyIntake.calories) {
            warning.textContent = '주의: 오늘의 칼로리 섭취량을 초과했습니다!';
        } else {
            warning.textContent = '';
        }

        generateRecommendation();
    }

    function generateRecommendation() {
        let recommendationText = '';
        const recommendedFoods = [];

        const needs = {
            carbs: dailyIntake.carbs - intake.carbs,
            protein: dailyIntake.protein - intake.protein,
            fat: dailyIntake.fat - intake.fat
        };

        const foods = foodData.map(food => ({
            name: food[0],
            carbs: parseFloat(food[10]),
            protein: parseFloat(food[8]),
            fat: parseFloat(food[9])
        }));

        while (needs.carbs > 0 || needs.protein > 0 || needs.fat > 0) {
            let bestFood = null;
            let bestImprovement = -Infinity;

            foods.forEach(food => {
                const improvement = Math.min(food.carbs / needs.carbs, food.protein / needs.protein, food.fat / needs.fat);
                if (improvement > bestImprovement) {
                    bestImprovement = improvement;
                    bestFood = food;
                }
            });

            if (!bestFood) break;

            recommendedFoods.push(bestFood);
            needs.carbs -= bestFood.carbs;
            needs.protein -= bestFood.protein;
            needs.fat -= bestFood.fat;

            foods.splice(foods.indexOf(bestFood), 1);
        }

        if (needs.carbs > 0) {
            recommendationText += `탄수화물 섭취량이 부족합니다. `;
        }
        if (needs.protein > 0) {
            recommendationText += `단백질 섭취량이 부족합니다. `;
        }
        if (needs.fat > 0) {
            recommendationText += `지방 섭취량이 부족합니다. `;
        }

        if (recommendedFoods.length > 0) {
            recommendationText += `추천 음식: ${recommendedFoods.map(food => food.name).join(', ')}`;
        }

        document.getElementById('recommendationText').textContent = recommendationText;
    }
});
