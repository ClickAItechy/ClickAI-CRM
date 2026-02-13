def num2words(num):
    """
    Converts a number to words (Simplified version for currency)
    """
    try:
        num = float(num)
    except ValueError:
        return "Zero"

    units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"]
    teens = ["", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
    tens = ["", "Ten", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
    thousands = ["", "Thousand", "Million", "Billion"]

    def convert_below_1000(n):
        if n == 0:
            return ""
        elif n < 10:
            return units[int(n)]
        elif n < 20:
            return teens[int(n) - 10] if n > 10 and n < 20 else tens[1] if n == 10 else ""
        elif n < 100:
            return tens[int(n) // 10] + (" " + units[int(n) % 10] if n % 10 != 0 else "")
        else:
            return units[int(n) // 100] + " Hundred" + (" " + convert_below_1000(n % 100) if n % 100 != 0 else "")

    if num == 0:
        return "Zero"

    words = ""
    i = 0
    main_part = int(num)
    decimal_part = int(round((num - main_part) * 100))

    while main_part > 0:
        if main_part % 1000 != 0:
            words = convert_below_1000(main_part % 1000) + " " + thousands[i] + " " + words
        main_part //= 1000
        i += 1
    
    words = words.strip()
    result = words + " Dirhams"
    
    if decimal_part > 0:
        result += " and " + convert_below_1000(decimal_part) + " Fils"
    
    return result + " Only"
