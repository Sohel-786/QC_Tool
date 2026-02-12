using Microsoft.AspNetCore.Mvc;
using net_backend.Services;

namespace net_backend.Controllers
{
    public abstract class DivisionIsolatedController : ControllerBase
    {
        protected readonly IDivisionService _divisionService;

        protected DivisionIsolatedController(IDivisionService divisionService)
        {
            _divisionService = divisionService;
        }

        protected int CurrentDivisionId
        {
            get
            {
                var divisionId = _divisionService.GetCurrentDivisionId();
                if (divisionId == null)
                {
                    throw new System.UnauthorizedAccessException("Division not selected");
                }
                return divisionId.Value;
            }
        }

        protected string CurrentDivisionName
        {
            get
            {
                var name = _divisionService.GetCurrentDivisionName();
                if (string.IsNullOrEmpty(name))
                {
                    throw new System.UnauthorizedAccessException("Division name not found or access denied");
                }
                return name;
            }
        }
    }
}
