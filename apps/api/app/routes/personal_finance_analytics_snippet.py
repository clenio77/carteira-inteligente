@router.get("/analytics/categories")
async def get_expenses_by_category(
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get expenses grouped by category for a specific month/year"""
    today = date.today()
    target_month = month or today.month
    target_year = year or today.year
    
    # Calculate start and end of month
    import calendar
    _, last_day = calendar.monthrange(target_year, target_month)
    start_date = date(target_year, target_month, 1)
    end_date = date(target_year, target_month, last_day)
    
    # Query: Sum amount by category, filter by date, type=EXPENSE, user
    results = db.query(
        TransactionCategory.name,
        func.sum(PersonalTransaction.amount).label("total")
    ).join(
        PersonalTransaction, PersonalTransaction.category_id == TransactionCategory.id
    ).filter(
        PersonalTransaction.user_id == current_user.id,
        PersonalTransaction.type == TransactionType.EXPENSE.value,
        PersonalTransaction.date >= start_date,
        PersonalTransaction.date <= end_date
    ).group_by(TransactionCategory.name).all()
    
    # Format response
    data = [{"name": r[0], "value": r[1]} for r in results]
    
    # Handle transactions without category (optional, if you allow null categories)
    uncategorized = db.query(func.sum(PersonalTransaction.amount)).filter(
        PersonalTransaction.user_id == current_user.id,
        PersonalTransaction.type == TransactionType.EXPENSE.value,
        PersonalTransaction.category_id == None,
        PersonalTransaction.date >= start_date,
        PersonalTransaction.date <= end_date
    ).scalar()
    
    if uncategorized and uncategorized > 0:
        data.append({"name": "Sem Categoria", "value": uncategorized})
        
    return data
